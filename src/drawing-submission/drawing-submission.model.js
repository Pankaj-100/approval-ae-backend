const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    file: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      default: "PENDING",
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    rejectionReason: {
      type: String,
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false },
);

const drawingSubmissionSchema = new mongoose.Schema(
  {
    referenceNumber: {
      type: String,
      required: true,
      unique: true,
    },

    floorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FloorDetails",
      required: true,
    },

    floorUnitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      required: true,
    },

    architectural: {
      autoCad: fileSchema,
      dwf: fileSchema,
    },

    mep: {
      autoCad: fileSchema,
      dwf: fileSchema,
    },

    structural: {
      autoCad: fileSchema,
      dwf: fileSchema,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("DrawingSubmission", drawingSubmissionSchema);
