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
    inspectionType,
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

  // const latest = files.find((f) => f.isLatest);

  //Approved lock
  // if (latest && latest.status === "APPROVED") {
  //   return next(new ErrorHandler("Approved document cannot be modified", 400));
  // }

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
    submissionid: doc._id,
    data: newVersion,
  });
});

//Get All Latest Documents
// exports.getAllInspection = catchAsync(async (req, res, next) => {
//   const { contractorApplicationId } = req.query;

//   const doc = await InspectionDetail.findOne({
//     contractorApplicationId,
//     isDeleted: false,
//   });

//   if (!doc) {
//     return next(new ErrorHandler("No inspection documents found", 404));
//   }

//   const getLatest = (arr) => arr?.find((f) => f.isLatest) || null;

//   const result = {};

//   for (let key of allowedDocs) {
//     result[key] = getLatest(doc.documents?.[key]);
//   }

//   res.status(200).json({
//     success: true,
//     data: result,
//   });
// });

// ================= GET ALL INSPECTION DOCUMENTS =================

// exports.getAllInspection = catchAsync(async (req, res, next) => {
//   const { contractorApplicationId, inspectionType } = req.query;

//   // FIND INSPECTION DOCUMENT
//   // const doc = await InspectionDetail.findOne({
//   //   contractorApplicationId,
//   //   inspectionType,
//   //   isDeleted: false,
//   // })

//   const doc = await InspectionDetail.find({
//     contractorApplicationId,
//     isDeleted: false,
//   })

//     // POPULATE APPROVED BY USER DETAILS
//     .populate("documents.sitePhoto.approvedBy", "name email")

//     .populate("documents.dcdCompletionCertificate.approvedBy", "name email")

//     .populate("documents.certificate.approvedBy", "name email")

//     .populate("documents.dmCompletionCertificate.approvedBy", "name email")

//     .populate("documents.architecturalAsBuilt.approvedBy", "name email")

//     .populate("documents.mepAsBuilt.approvedBy", "name email")

//     .populate("documents.structuralAsBuilt.approvedBy", "name email")

//     .populate("documents.testCertificates.approvedBy", "name email")

//     .populate("documents.commonAreaDamageClearance.approvedBy", "name email")

//     .populate("documents.revisedAuthorityDrawings.approvedBy", "name email");

//   // CHECK DOCUMENT EXISTS
//   if (!doc) {
//     return next(new ErrorHandler("No inspection documents found", 404));
//   }

//   // GET LATEST FILE VERSION
//   const getLatest = (arr) => arr?.find((f) => f.isLatest) || null;

//   const result = {};

//   // LOOP ALL DOCUMENT TYPES
//   for (let key of allowedDocs) {
//     // GET LATEST DOCUMENT
//     const latestDoc = getLatest(doc.documents?.[key]);

//     // STORE CLEAN RESPONSE
//     result[key] = latestDoc
//       ? {
//           versionNumber: latestDoc.versionNumber,

//           fileUrl: latestDoc.fileUrl,

//           fileName: latestDoc.fileName,

//           uploadedAt: latestDoc.uploadedAt,

//           status: latestDoc.status,

//           approvedBy: latestDoc.approvedBy || null,

//           approvedAt: latestDoc.approvedAt || null,

//           rejectionReason: latestDoc.rejectionReason || null,

//           rejectionReasonDoc: latestDoc.rejectionReasonDoc || null,

//           appointmentDateTime: latestDoc.appointmentDateTime || null,

//           isLatest: latestDoc.isLatest,
//         }
//       : null;
//   }

//   // RESPONSE
//   res.status(200).json({
//     success: true,
//     data: {
//       // INSPECTION TYPE
//       inspectionType: doc.inspectionType,

//       // ALL DOCUMENTS
//       documents: result,
//     },
//   });
// });

exports.getAllInspection = catchAsync(async (req, res, next) => {
  const { contractorApplicationId } = req.query;

  if (!contractorApplicationId) {
    return next(new ErrorHandler("contractorApplicationId is required", 400));
  }

  const docs = await InspectionDetail.find({
    contractorApplicationId,
    isDeleted: false,
  })
    .populate("documents.sitePhoto.approvedBy", "name email")
    .populate("documents.dcdCompletionCertificate.approvedBy", "name email")
    .populate("documents.certificate.approvedBy", "name email")
    .populate("documents.dmCompletionCertificate.approvedBy", "name email")
    .populate("documents.architecturalAsBuilt.approvedBy", "name email")
    .populate("documents.mepAsBuilt.approvedBy", "name email")
    .populate("documents.structuralAsBuilt.approvedBy", "name email")
    .populate("documents.testCertificates.approvedBy", "name email")
    .populate("documents.commonAreaDamageClearance.approvedBy", "name email")
    .populate("documents.revisedAuthorityDrawings.approvedBy", "name email");

  if (!docs.length) {
    return next(new ErrorHandler("No inspection documents found", 404));
  }

  const getLatest = (arr) => arr?.find((f) => f.isLatest) || null;

  const response = docs.map((doc) => {
    const result = {};

    for (let key of allowedDocs) {
      const latestDoc = getLatest(doc.documents?.[key]);
      result[key] = latestDoc
        ? {
            versionNumber: latestDoc.versionNumber,
            fileUrl: latestDoc.fileUrl,
            fileName: latestDoc.fileName,
            uploadedAt: latestDoc.uploadedAt,
            status: latestDoc.status,
            approvedBy: latestDoc.approvedBy || null,
            approvedAt: latestDoc.approvedAt || null,
            rejectionReason: latestDoc.rejectionReason || null,
            rejectionReasonDoc: latestDoc.rejectionReasonDoc || null,
            appointmentDateTime: latestDoc.appointmentDateTime || null,
            isLatest: latestDoc.isLatest,
          }
        : null;
    }

    return {
      submissionId: doc._id,
      inspectionType: doc.inspectionType,
      documents: result,
    };
  });

  res.status(200).json({
    success: true,
    data: response,
  });
});

//Review (Approve / Reject)
exports.reviewInspection = catchAsync(async (req, res, next) => {
  const {
    contractorApplicationId,
    inspectionType,
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
    inspectionType,
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
  const { contractorApplicationId, inspectionType, documentType } = req.query;

  const doc = await InspectionDetail.findOne({
    contractorApplicationId,
    inspectionType,
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
  const {
    contractorApplicationId,
    inspectionType,
    documentType,
    fileUrl,
    fileName,
  } = req.body;

  const doc = await InspectionDetail.findOne({
    contractorApplicationId,
    inspectionType,
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
