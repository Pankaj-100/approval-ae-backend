const mongoose = require("mongoose");

const fileVersionSchema = new mongoose.Schema(
  {
    versionNumber: {
      type: Number,
      required: true,
    },

    fileUrl: {
      type: String,
      required: true,
    },

    fileName: String,

    uploadedAt: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    approvedAt: Date,

    approvalRemarks: {
      type: String,
      default: null,
    },

    rejectionReason: String,

    rejectionReasonDoc: {
      type: String,
    },

    isLatest: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false },
);

const drawingSubmissionSchema = new mongoose.Schema(
  {
    contractorApplicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ContractorApplication",
      required: true,
    },

    floorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FloorDetails",
    },

    floorUnitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
    },

    architectural: {
      // reviewer: {
      //   type: mongoose.Schema.Types.ObjectId,
      //   ref: "User",
      //   default: null,
      // },

      autoCad: [fileVersionSchema],
      dwf: [fileVersionSchema],
    },

    mep: {
      // reviewer: {
      //   type: mongoose.Schema.Types.ObjectId,
      //   ref: "User",
      //   default: null,
      // },
      autoCad: [fileVersionSchema],
      dwf: [fileVersionSchema],
    },

    structural: {
      // reviewer: {
      //   type: mongoose.Schema.Types.ObjectId,
      //   ref: "User",
      //   default: null,
      // },
      autoCad: [fileVersionSchema],
      dwf: [fileVersionSchema],
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

drawingSubmissionSchema.index(
  { contractorApplicationId: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);

module.exports = mongoose.model("DrawingSubmission", drawingSubmissionSchema);
