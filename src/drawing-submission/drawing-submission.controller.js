const catchAsync = require("../../utils/catchAsyncError");
const ErrorHandler = require("../../utils/errorHandler");
const DrawingSubmission = require("./drawing-submission.model");

// // create drawing submission
// exports.createDrawingSubmission = async (req, res) => {
//   try {
//     // generate reference number
//     const randomNumber = Math.floor(100000000 + Math.random() * 900000000);

//     const referenceNumber = `APP${randomNumber}`;

//     const drawingSubmission = await DrawingSubmission.create({
//       ...req.body,
//       referenceNumber,
//     });

//     return res.status(201).json({
//       success: true,
//       message: "Drawing Submission created successfully",
//       data: drawingSubmission,
//     });
//   } catch (error) {
//     return res.status(400).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// // get all submissions
// exports.getAllDrawingSubmission = async (req, res) => {
//   try {
//     const submissions = await DrawingSubmission.find({
//       isDeleted: false,
//     })
//       .populate("floorId", "floorName")
//       .populate("floorUnitId", "tenantName")
//       .sort({ createdAt: -1 });

//     return res.status(200).json({
//       success: true,
//       data: submissions,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// //get single submission
// exports.getDrawingSubmissionById = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const submission = await DrawingSubmission.findOne({
//       _id: id,
//       isDeleted: false,
//     })
//       .populate("floorId", "floorName")
//       .populate("floorUnitId", "tenantName");

//     if (!submission) {
//       return res.status(404).json({
//         success: false,
//         message: "Submission not found",
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       data: submission,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// // update file status
// exports.updateFileStatus = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const documentType = req.body.documentType;
//     const fileType = req.body.fileType;
//     const status = req.body.status;
//     const approvedBy = req.body.approvedBy;
//     const rejectionReason = req.body.rejectionReason;

//     const drawingSubmission = await DrawingSubmission.findById(id);

//     if (!drawingSubmission || drawingSubmission.isDeleted) {
//       return res.status(404).json({
//         success: false,
//         message: "Drawing Submission not found",
//       });
//     }

//     if (!drawingSubmission[documentType]) {
//       return res.status(404).json({
//         success: false,
//         message: "Inavlid document type",
//       });
//     }

//     if (!drawingSubmission[documentType][fileType]) {
//       return res.status(404).json({
//         success: false,
//         message: "Inavlid document type",
//       });
//     }

//     // update status
//     drawingSubmission[documentType][fileType].status = status;
//     drawingSubmission[documentType][fileType].approvedBy = approvedBy;
//     drawingSubmission[documentType][fileType].rejectionReason = rejectionReason;
//     drawingSubmission[documentType][fileType].approvedAt =
//       status === "APPROVED" ? new Date() : null;

//     await drawingSubmission.save();

//     return res.status(200).json({
//       success: true,
//       message: "File status updated successfully",
//       data: drawingSubmission,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// // update single submission
// exports.updateSingleDrawingSubmission = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { documentType, fileType, file } = req.body;

//     const drawingSubmission = await DrawingSubmission.findById(id);

//     if (!drawingSubmission || drawingSubmission.isDeleted) {
//       return res.status(404).json({
//         success: false,
//         message: "Drawing Submission not found",
//       });
//     }

//     if (!drawingSubmission[documentType]) {
//       return res.status(404).json({
//         success: false,
//         message: "Inavlid document type",
//       });
//     }

//     if (!drawingSubmission[documentType][fileType]) {
//       return res.status(404).json({
//         success: false,
//         message: "Inavlid document type",
//       });
//     }

//     //update file
//     drawingSubmission[documentType][fileType].file = file;

//     // resest to default state
//     drawingSubmission[documentType][fileType].status = "PENDING";
//     drawingSubmission[documentType][fileType].approvedBy = null;
//     drawingSubmission[documentType][fileType].rejectionReason = null;
//     drawingSubmission[documentType][fileType].approvedAt = null;

//     await drawingSubmission.save();

//     return res.status(200).json({
//       success: true,
//       message: "File updated successfully",
//       data: drawingSubmission,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// // update drawing submission
// exports.updateDrawingSubmission = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const drawingSubmission = await DrawingSubmission.findOneAndUpdate(
//       { _id: id, isDeleted: false },
//       req.body,
//       { new: true },
//     );

//     if (!drawingSubmission) {
//       return res.status(404).json({
//         success: false,
//         message: "Drawing Submission not found",
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: "Drawing Submission updated successfully",
//       data: drawingSubmission,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// // delete drawing submission
// exports.deleteDrawingSubmission = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const drawingSubmission = await DrawingSubmission.findOneAndUpdate(
//       { _id: id, isDeleted: false },
//       { isDeleted: true },
//       { new: true },
//     );

//     if (!drawingSubmission) {
//       return res.status(404).json({
//         success: false,
//         message: "Drawing Submission not found",
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: "Drawing Submission deleted successfully",
//       data: drawingSubmission,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

exports.uploadDrawing = catchAsync(async (req, res, next) => {
  const {
    contractorApplicationId,
    type, // architectural | mep | structural
    subType, // autoCad | dwf
    fileUrl,
    fileName,
  } = req.body;

  if (!contractorApplicationId || !type || !subType || !fileUrl) {
    return next(new ErrorHandler("All required fields must be provided", 400));
  }

  let doc = await DrawingSubmission.findOne({
    contractorApplicationId,
    isDeleted: false,
  });

  // Create if not exists
  if (!doc) {
    doc = await DrawingSubmission.create({
      contractorApplicationId,
    });
  }

  const files = doc[type]?.[subType] || [];

  // Old versions → not latest
  files.forEach((f) => (f.isLatest = false));

  const newVersion = {
    versionNumber: files.length + 1,
    fileUrl,
    fileName,
    isLatest: true,
  };

  files.push(newVersion);

  doc[type][subType] = files;

  await doc.save();

  res.status(200).json({
    success: true,
    message: "File uploaded successfully",
    data: newVersion,
  });
});

exports.getLatestDrawing = catchAsync(async (req, res, next) => {
  const { contractorApplicationId, type, subType } = req.query;

  if (!contractorApplicationId || !type || !subType) {
    return next(new ErrorHandler("Required query params missing", 400));
  }

  const doc = await DrawingSubmission.findOne({
    contractorApplicationId,
    isDeleted: false,
  });

  if (!doc) {
    return next(new ErrorHandler("Drawing not found", 404));
  }

  const files = doc[type]?.[subType] || [];

  const latest = files.find((f) => f.isLatest);

  res.status(200).json({
    success: true,
    data: latest || null,
  });
});

exports.getDrawingHistory = catchAsync(async (req, res, next) => {
  const { contractorApplicationId, type, subType } = req.query;

  if (!contractorApplicationId || !type || !subType) {
    return next(new ErrorHandler("Required query params missing", 400));
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

exports.getDrawingDetails = catchAsync(async (req, res, next) => {
  const { contractorApplicationId, type, subType } = req.query;

  if (!contractorApplicationId || !type || !subType) {
    return next(new ErrorHandler("Required query params missing", 400));
  }

  const doc = await DrawingSubmission.findOne({
    contractorApplicationId,
    isDeleted: false,
  });

  if (!doc) {
    return next(new ErrorHandler("Drawing not found", 404));
  }

  const files = doc[type]?.[subType] || [];

  //Latest version
  const latest = files.find((f) => f.isLatest) || null;

  //Previous versions
  const previousVersions = files.filter((f) => !f.isLatest);

  //Last rejected (if any)
  const lastRejected = [...files]
    .reverse()
    .find((f) => f.status === "REJECTED");

  res.status(200).json({
    success: true,
    data: {
      latestDocument: latest,
      previousDocuments: previousVersions,
      totalVersions: files.length,
      lastRejected: lastRejected
        ? {
            versionNumber: lastRejected.versionNumber,
            rejectionReason: lastRejected.rejectionReason,
          }
        : null,
    },
  });
});
