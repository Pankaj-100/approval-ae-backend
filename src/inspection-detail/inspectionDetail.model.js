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

const inspectionDetailSchema = new mongoose.Schema(
  {
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

    inspectionType: {
      type: String,
      default: "Final Inspection",
    },

    documents: {
      sitePhoto: fileSchema,
      dcdCompletionCertificate: fileSchema,
      dmCompletionCertificate: fileSchema,
      architecturalAsBuilt: fileSchema,
      mepAsBuilt: fileSchema,
      structuralAsBuilt: fileSchema,
      testCertificates: fileSchema,
      commonAreaDamageClearance: fileSchema,
      revisedAuthorityDrawings: fileSchema,
    },

    overallStatus: {
      type: String,
      default: "PENDING",
    },

    submittedAt: {
      type: Date,
      default: Date.now,
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

module.exports = mongoose.model("InspectionDetail", inspectionDetailSchema);
