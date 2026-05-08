const catchAsync = require("../../utils/catchAsyncError");
const ErrorHandler = require("../../utils/errorHandler");
const DrawingSubmission = require("./drawing-submission.model");

const allowedTypes = ["architectural", "mep", "structural"];
const allowedSubTypes = ["autoCad", "dwf"];

//Submit Drawing (fileUrl based)
exports.submitDrawing = catchAsync(async (req, res, next) => {
  const { contractorApplicationId, type, subType, fileUrl, fileName } =
    req.body;

  if (!contractorApplicationId || !type || !subType || !fileUrl) {
    return next(new ErrorHandler("Missing required fields", 400));
  }

  if (!allowedTypes.includes(type) || !allowedSubTypes.includes(subType)) {
    return next(new ErrorHandler("Invalid type or subType", 400));
  }

  let doc = await DrawingSubmission.findOne({
    contractorApplicationId,
    isDeleted: false,
  });

  if (!doc) {
    doc = await DrawingSubmission.create({ contractorApplicationId });
  }

  //safe init
  if (!doc[type]) doc[type] = {};
  if (!doc[type][subType]) doc[type][subType] = [];

  const files = doc[type][subType];

  // old versions not latest
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
    message: "Drawing submitted successfully",
    data: {
      drawingSubmissionId: doc._id,
      version: newVersion,
    },
  });
});

//Get All Latest Drawings
exports.getAllDrawings = catchAsync(async (req, res, next) => {
  const { contractorApplicationId } = req.query;

  const doc = await DrawingSubmission.findOne({
    contractorApplicationId,
    isDeleted: false,
  });

  if (!doc) {
    return next(new ErrorHandler("No drawings found", 404));
  }

  const getLatest = (arr) => arr?.find((f) => f.isLatest) || null;

  res.status(200).json({
    success: true,
    data: {
      architectural: {
        autoCad: getLatest(doc.architectural?.autoCad),
        dwf: getLatest(doc.architectural?.dwf),
      },
      mep: {
        autoCad: getLatest(doc.mep?.autoCad),
        dwf: getLatest(doc.mep?.dwf),
      },
      structural: {
        autoCad: getLatest(doc.structural?.autoCad),
        dwf: getLatest(doc.structural?.dwf),
      },
    },
  });
});

//Approve / Reject Drawing (with remarks)
exports.reviewDrawing = catchAsync(async (req, res, next) => {
  const {
    contractorApplicationId,
    type,
    subType,
    versionNumber,
    status,
    rejectionReason,
  } = req.body;

  if (
    !contractorApplicationId ||
    !type ||
    !subType ||
    !versionNumber ||
    !status
  ) {
    return next(new ErrorHandler("Missing required fields", 400));
  }

  const doc = await DrawingSubmission.findOne({
    contractorApplicationId,
    isDeleted: false,
  });

  if (!doc) {
    return next(new ErrorHandler("Drawing not found", 404));
  }

  const files = doc[type]?.[subType] || [];

  const file = files.find((f) => f.versionNumber === versionNumber);

  if (!file) {
    return next(new ErrorHandler("Version not found", 404));
  }

  file.status = status;
  file.approvedAt = new Date();

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
exports.getDocumentVersions = catchAsync(async (req, res, next) => {
  const { contractorApplicationId, type, subType } = req.query;

  if (!contractorApplicationId || !type || !subType) {
    return next(new ErrorHandler("Missing params", 400));
  }

  const doc = await DrawingSubmission.findOne({
    contractorApplicationId,
    isDeleted: false,
  });

  if (!doc) {
    return next(new ErrorHandler("Drawing not found", 404));
  }

  const files = doc[type]?.[subType] || [];

  res.status(200).json({
    success: true,
    totalVersions: files.length,
    data: files,
  });
});

//Reupload after rejection
exports.reuploadDrawing = catchAsync(async (req, res, next) => {
  const { contractorApplicationId, type, subType, fileUrl, fileName } =
    req.body;

  const doc = await DrawingSubmission.findOne({
    contractorApplicationId,
    isDeleted: false,
  });

  if (!doc) {
    return next(new ErrorHandler("Drawing not found", 404));
  }

  const files = doc[type]?.[subType] || [];

  const latest = files.find((f) => f.isLatest);

  if (!latest || latest.status !== "REJECTED") {
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
// ======================================================
// REQUEST FOR REVISION
// ======================================================

exports.requestForRevision = catchAsync(async (req, res, next) => {
  const { drawingSubmissionId } = req.params;

  // ================= FIND DRAWING SUBMISSION =================

  const drawingSubmission =
    await DrawingSubmission.findById(drawingSubmissionId);

  if (!drawingSubmission) {
    return next(new ErrorHandler("Drawing submission not found", 404));
  }

  // ================= DRAWING TYPES =================

  const drawingTypes = ["architectural", "mep", "structural"];

  // ================= FILE TYPES =================

  const fileTypes = ["autoCad", "dwf"];

  // ================= STORE LATEST VERSION =================

  let latestVersion = 1;

  // ================= MAKE OLD FILES NOT LATEST =================

  drawingTypes.forEach((drawingType) => {
    fileTypes.forEach((fileType) => {
      drawingSubmission[drawingType][fileType].forEach((file) => {
        // check latest file
        if (file.isLatest) {
          // store highest version number
          latestVersion = Math.max(latestVersion, file.versionNumber);

          // make old file
          file.isLatest = false;
        }
      });
    });
  });

  // ================= SAVE =================

  await drawingSubmission.save();

  // ================= RESPONSE =================

  res.status(200).json({
    success: true,

    message: "Revision requested successfully",

    // contractor will upload
    // new files with this version

    newVersion: latestVersion + 1,
  });
});
