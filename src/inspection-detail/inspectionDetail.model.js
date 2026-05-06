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
      default: null,
    },

    appointmentDateTime: {
      type: Date,
      default: null,
    },

    isLatest: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false },
);

const inspectionDetailSchema = new mongoose.Schema(
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

    inspectionType: {
      type: String,
      enum: ["Final_Inspection", "First_Fix_Below", "First_Fix_Above"],
      default: "Final_Inspection",
    },

    documents: {
      sitePhoto: [fileVersionSchema],
      dcdCompletionCertificate: [fileVersionSchema],
      certificate: [fileVersionSchema],
      dmCompletionCertificate: [fileVersionSchema],
      architecturalAsBuilt: [fileVersionSchema],
      mepAsBuilt: [fileVersionSchema],
      structuralAsBuilt: [fileVersionSchema],
      testCertificates: [fileVersionSchema],
      commonAreaDamageClearance: [fileVersionSchema],
      revisedAuthorityDrawings: [fileVersionSchema],
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

inspectionDetailSchema.index(
  { contractorApplicationId: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);

module.exports = mongoose.model("InspectionDetail", inspectionDetailSchema);
