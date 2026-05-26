const WorkPermit = require("./workPermit.model");
const catchAsync = require("../../utils/catchAsyncError");
const ErrorHandler = require("../../utils/errorHandler");

const allowedDocs = [
  "dcd",
  "dewaApproval",
  "dmDdaDrawings",
  "subcontractorUndertaking",
  "carInsurance",
  "workmenCompensationInsurance",
  "emiratesId",
  "commonAreaProtection",
  "securityCheque", // optional
];

//Submit Document
exports.submitWorkPermit = catchAsync(async (req, res, next) => {
  const { contractorApplicationId, documentType, fileUrl, fileName } = req.body;

  if (!contractorApplicationId || !documentType || !fileUrl) {
    return next(new ErrorHandler("Missing required fields", 400));
  }

  if (!allowedDocs.includes(documentType)) {
    return next(new ErrorHandler("Invalid document type", 400));
  }

  let doc = await WorkPermit.findOne({
    contractorApplicationId,
    isDeleted: false,
  });

  if (!doc) {
    doc = await WorkPermit.create({ contractorApplicationId });
  }

  // safe init
  if (!doc.documents) doc.documents = {};
  if (!doc.documents[documentType]) doc.documents[documentType] = [];

  const files = doc.documents[documentType];

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
    message: "Work permit document submitted",
    data: {
      workPermitId: doc._id,
      version: newVersion,
    },
  });
});

//Get All Latest Documents
exports.getAllWorkPermit = catchAsync(async (req, res, next) => {
  const { contractorApplicationId } = req.query;

  const doc = await WorkPermit.findOne({
    contractorApplicationId,
    isDeleted: false,
  }) // POPULATE APPROVED BY
    .populate("documents.dcd.approvedBy", "name email")

    .populate("documents.dewaApproval.approvedBy", "name email")

    .populate("documents.dmDdaDrawings.approvedBy", "name email")

    .populate("documents.subcontractorUndertaking.approvedBy", "name email")

    .populate("documents.carInsurance.approvedBy", "name email")

    .populate("documents.workmenCompensationInsurance.approvedBy", "name email")

    .populate("documents.emiratesId.approvedBy", "name email")

    .populate("documents.commonAreaProtection.approvedBy", "name email")

    .populate("documents.securityCheque.approvedBy", "name email");

  if (!doc) {
    return next(new ErrorHandler("No documents found", 404));
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

//Approve / Reject
exports.reviewWorkPermit = catchAsync(async (req, res, next) => {
  const {
    contractorApplicationId,
    documentType,
    versionNumber,
    status,
    rejectionReason,
  } = req.body;

  const doc = await WorkPermit.findOne({
    contractorApplicationId,
    isDeleted: false,
  });

  if (!doc) {
    return next(new ErrorHandler("Work permit not found", 404));
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
    message: `Document ${status}`,
  });
});

//Get Versions
exports.getWorkPermitVersions = catchAsync(async (req, res, next) => {
  const { contractorApplicationId, documentType } = req.query;

  const doc = await WorkPermit.findOne({
    contractorApplicationId,
    isDeleted: false,
  });

  if (!doc) {
    return next(new ErrorHandler("Work permit not found", 404));
  }

  const files = doc.documents?.[documentType] || [];

  res.status(200).json({
    success: true,
    totalVersions: files.length,
    data: files,
  });
});

//Reupload (only if rejected)
exports.reuploadWorkPermit = catchAsync(async (req, res, next) => {
  const { contractorApplicationId, documentType, fileUrl, fileName } = req.body;

  const doc = await WorkPermit.findOne({
    contractorApplicationId,
    isDeleted: false,
  });

  if (!doc) {
    return next(new ErrorHandler("Work permit not found", 404));
  }

  const files = doc.documents?.[documentType] || [];

  const latest = files.find((f) => f.isLatest);

  if (!latest || latest.status !== "REJECTED") {
    return next(new ErrorHandler("Only rejected file can be reuploaded", 400));
  }

  files.forEach((f) => (f.isLatest = false));

  const newVersion = {
    versionNumber: latest.versionNumber + 1,
    fileUrl,
    fileName,
    uploadedBy: req.user?._id,
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
