const InspectionDetail = require("./inspectionDetail.model");
const catchAsync = require("../../utils/catchAsyncError");
const ErrorHandler = require("../../utils/errorHandler");

//Allowed Docs
const allowedDocs = [
  "sitePhoto",
  "certificate",
  "dcdCompletionCertificate",
  "dmCompletionCertificate",
  "architecturalAsBuilt",
  "mepAsBuilt",
  "structuralAsBuilt",
  "testCertificates",
  "commonAreaDamageClearance",
  "revisedAuthorityDrawings",
];

//Validation based on inspection type
const validateDocumentByInspectionType = (inspectionType, documentType) => {
  if (inspectionType === "Final_Inspection") {
    return allowedDocs.includes(documentType);
  }

  // FIRST FIX restricted
  const limitedDocs = ["sitePhoto", "certificate"];
  return limitedDocs.includes(documentType);
};

//Submit
exports.submitInspection = catchAsync(async (req, res, next) => {
  const {
    contractorApplicationId,
    documentType,
    fileUrl,
    fileName,
    inspectionType,
  } = req.body;

  if (!contractorApplicationId || !documentType || !fileUrl) {
    return next(new ErrorHandler("Missing required fields", 400));
  }

  let doc = await InspectionDetail.findOne({
    contractorApplicationId,
    isDeleted: false,
  });

  //create new
  if (!doc) {
    if (!inspectionType) {
      return next(new ErrorHandler("inspectionType is required", 400));
    }

    doc = await InspectionDetail.create({
      contractorApplicationId,
      inspectionType,
    });
  }

  const currentInspectionType = doc.inspectionType;

  //validation
  if (!validateDocumentByInspectionType(currentInspectionType, documentType)) {
    return next(
      new ErrorHandler(
        `Document ${documentType} not allowed for ${currentInspectionType}`,
        400,
      ),
    );
  }

  // safe init
  if (!doc.documents) doc.documents = {};
  if (!doc.documents[documentType]) doc.documents[documentType] = [];

  const files = doc.documents[documentType];

  const latest = files.find((f) => f.isLatest);

  //Approved lock
  if (latest && latest.status === "APPROVED") {
    return next(new ErrorHandler("Approved document cannot be modified", 400));
  }

  // mark old versions
  files.forEach((f) => (f.isLatest = false));

  const lastVersion = files[files.length - 1];

  const newVersion = {
    versionNumber: lastVersion ? lastVersion.versionNumber + 1 : 1,
    fileUrl,
    fileName,
    isLatest: true,
    status: "PENDING",
  };

  files.push(newVersion);

  await doc.save();

  res.status(200).json({
    success: true,
    message: "Inspection document submitted",
    data: newVersion,
  });
});

//Get All Latest Documents
exports.getAllInspection = catchAsync(async (req, res, next) => {
  const { contractorApplicationId } = req.query;

  const doc = await InspectionDetail.findOne({
    contractorApplicationId,
    isDeleted: false,
  });

  if (!doc) {
    return next(new ErrorHandler("No inspection documents found", 404));
  }

  const getLatest = (arr) => arr?.find((f) => f.isLatest) || null;

  const result = {};

  for (let key of allowedDocs) {
    result[key] = getLatest(doc.documents?.[key]);
  }

  res.status(200).json({
    success: true,
    data: result,
  });
});

//Review (Approve / Reject)
exports.reviewInspection = catchAsync(async (req, res, next) => {
  const {
    contractorApplicationId,
    documentType,
    versionNumber,
    status,
    rejectionReason,
  } = req.body;

  if (!["APPROVED", "REJECTED"].includes(status)) {
    return next(new ErrorHandler("Invalid status", 400));
  }

  const doc = await InspectionDetail.findOne({
    contractorApplicationId,
    isDeleted: false,
  });

  if (!doc) {
    return next(new ErrorHandler("Inspection not found", 404));
  }

  const files = doc.documents?.[documentType] || [];

  const file = files.find((f) => f.versionNumber === versionNumber);

  if (!file) {
    return next(new ErrorHandler("Version not found", 404));
  }

  file.status = status;
  file.approvedAt = new Date();
  file.approvedBy = req.user?._id;

  if (status === "REJECTED") {
    file.rejectionReason = rejectionReason;
  }

  await doc.save();

  res.status(200).json({
    success: true,
    message: `Inspection document ${status}`,
  });
});

//Get Versions
exports.getInspectionVersions = catchAsync(async (req, res, next) => {
  const { contractorApplicationId, documentType } = req.query;

  const doc = await InspectionDetail.findOne({
    contractorApplicationId,
    isDeleted: false,
  });

  if (!doc) {
    return next(new ErrorHandler("Inspection not found", 404));
  }

  const files = doc.documents?.[documentType] || [];

  res.status(200).json({
    success: true,
    totalVersions: files.length,
    data: files,
  });
});

//Reupload (ONLY if rejected + NOT approved)
exports.reuploadInspection = catchAsync(async (req, res, next) => {
  const { contractorApplicationId, documentType, fileUrl, fileName } = req.body;

  const doc = await InspectionDetail.findOne({
    contractorApplicationId,
    isDeleted: false,
  });

  if (!doc) {
    return next(new ErrorHandler("Inspection not found", 404));
  }

  const files = doc.documents?.[documentType] || [];

  const latest = files.find((f) => f.isLatest);

  if (!latest) {
    return next(new ErrorHandler("No document found", 404));
  }

  //Approved lock
  if (latest.status === "APPROVED") {
    return next(
      new ErrorHandler("Approved document cannot be reuploaded", 400),
    );
  }

  if (latest.status !== "REJECTED") {
    return next(new ErrorHandler("Only rejected file can be reuploaded", 400));
  }

  files.forEach((f) => (f.isLatest = false));

  const newVersion = {
    versionNumber: latest.versionNumber + 1,
    fileUrl,
    fileName,
    isLatest: true,
    status: "PENDING",
  };

  files.push(newVersion);

  await doc.save();

  res.status(200).json({
    success: true,
    message: "Reuploaded successfully",
    data: newVersion,
  });
});
