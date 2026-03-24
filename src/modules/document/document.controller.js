const ErrorHandler = require("../../../utils/errorHandler");
const catchAsync = require("../../../utils/catchAsyncError");

/* ===============================
   VIEW DOCUMENTS
   Requires: documents gate, priority 1+
=============================== */
exports.viewDocuments = catchAsync(async (req, res) => {
  res.json({
    success: true,
    message: "Documents retrieved successfully",
    data: [
      { id: 1, name: "Document 1", status: "approved" },
      { id: 2, name: "Document 2", status: "pending" },
      { id: 3, name: "Document 3", status: "approved" },
    ],
  });
});

/* ===============================
   EDIT DOCUMENTS
   Requires: documents gate, priority 2+
=============================== */
exports.editDocuments = catchAsync(async (req, res, next) => {
  const { id, name, status } = req.body;

  if (!id || !name) {
    return next(new ErrorHandler("Document ID and name are required", 400));
  }

  res.json({
    success: true,
    message: "Document updated successfully",
    data: {
      id,
      name,
      status: status || "pending",
      updatedAt: new Date(),
    },
  });
});

/* ===============================
   DELETE DOCUMENTS
   Requires: documents gate, priority 3+
=============================== */
exports.deleteDocuments = catchAsync(async (req, res, next) => {
  const { id } = req.body;

  if (!id) {
    return next(new ErrorHandler("Document ID is required", 400));
  }

  res.json({
    success: true,
    message: "Document deleted successfully",
    deletedId: id,
  });
});

/* ===============================
   APPROVE DOCUMENTS
   Requires: approvals gate, any priority
=============================== */
exports.approveDocuments = catchAsync(async (req, res, next) => {
  const { id, approverComments } = req.body;

  if (!id) {
    return next(new ErrorHandler("Document ID is required", 400));
  }

  res.json({
    success: true,
    message: "Document approved successfully",
    data: {
      id,
      status: "approved",
      approvedBy: req.user.name,
      approverComments: approverComments || "",
      approvedAt: new Date(),
    },
  });
});

/* ===============================
   REJECT DOCUMENTS
   Requires: approvals gate, priority 2+
=============================== */
exports.rejectDocuments = catchAsync(async (req, res, next) => {
  const { id, rejectionReason } = req.body;

  if (!id || !rejectionReason) {
    return next(
      new ErrorHandler("Document ID and rejection reason are required", 400)
    );
  }

  res.json({
    success: true,
    message: "Document rejected successfully",
    data: {
      id,
      status: "rejected",
      rejectedBy: req.user.name,
      rejectionReason,
      rejectedAt: new Date(),
    },
  });
});
