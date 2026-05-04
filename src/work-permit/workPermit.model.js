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

    approvedAt: Date,

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

const workPermitSchema = new mongoose.Schema(
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

    documents: {
      dcd: [fileVersionSchema],
      dewaApproval: [fileVersionSchema],
      dmDdaDrawings: [fileVersionSchema],
      subcontractorUndertaking: [fileVersionSchema],
      carInsurance: [fileVersionSchema],
      workmenCompensationInsurance: [fileVersionSchema],
      emiratesId: [fileVersionSchema],
      commonAreaProtection: [fileVersionSchema],
      securityCheque: [fileVersionSchema],
    },

    workPermitDoc: {
      fileUrl: String,
      uploadedAt: Date,
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

workPermitSchema.index(
  { contractorApplicationId: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);

module.exports = mongoose.model("WorkPermit", workPermitSchema);
