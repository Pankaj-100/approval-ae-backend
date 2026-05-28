const mongoose = require("mongoose");

// ================= DOCUMENT VERSION =================
const documentVersionSchema = new mongoose.Schema(
  {
    versionNumber: { type: Number, required: true },
    fileUrl: { type: String, required: true },
    fileName: { type: String },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    uploadedAt: { type: Date, default: Date.now },
    remarks: { type: String, default: null },
  },
  { _id: false },
);

// ================= VERSION SCHEMA =================
const versionSchema = new mongoose.Schema(
  {
    versionNumber: { type: Number, required: true },

    usageType: String,
    totalUnitAreaSqm: Number,
    areaVariationSqm: Number,
    hasMezzanine: Boolean,
    mezzanineAreaToAdd: {
      type: Number,
      default: 0,
    },

    fitOutAffectedAreaAfterMezzanine: {
      type: Number,
      default: 0,
    },
    totalUnitAreaAfterMezzanineSqm: Number,

    tenantName: String,
    tenantMobile: String,
    tenantEmail: String,

    //REDESIGN ADD
    redesign: {
      redesignType: {
        type: String,
        enum: ["MERGE", "SPLIT", "SPLIT_AND_MERGE", "MERGE_AND_SPLIT"],
      },

      inputUnits: [
        {
          unitId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Unit",
          },
          area: Number,
        },
      ],

      resultUnits: [
        {
          name: String,
          area: Number,
        },
      ],
    },

    documents: {
      ejariDocument: [documentVersionSchema],
      appointmentLetter: [documentVersionSchema],
      fitOutDrawings: [documentVersionSchema],
    },

    status: {
      type: String,
      enum: ["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"],
      default: "UNDER_REVIEW",
    },

    remarks: { type: String, default: null },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

//SCHEMA
const contractorApplicationSchema = new mongoose.Schema(
  {
    referenceNumber: {
      type: String,
      required: true,
      unique: true,
    },

    plotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlotDetails",
      required: true,
    },
    floorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FloorDetails",
      required: true,
    },
    buildingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BuildingDetails",
      required: true,
    },

    //OPTIONAL NOW
    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      required: false,
    },

    //new fields
    contractorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    jobStatus: {
      type: String,
      enum: [
        "APPLICATION_REVIEW",
        "DESIGN_REVIEW",
        "NOC_PENDING",
        "WORK_PERMIT",
        "INSPECTION",
        "COMPLETED",
      ],
      default: "APPLICATION_REVIEW",
    },

    // currentStatus: {
    //   type: String,
    //   enum: ["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"],
    //   default: "PENDING",
    // },

    // approvalStatus: {
    //   type: String,
    //   enum: ["PENDING", "APPROVED", "REJECTED"],
    //   default: "PENDING",
    // },

    plotNumber: String,
    buildingName: String,
    floorNumber: String,

    displayUnit: {
      type: String,
      required: true,
    },

    unitType: {
      type: String,
      enum: ["Single Unit", "Redesign Unit"],
      default: "Single Unit",
    },

    currentVersion: { type: Number, default: 1 },
    versions: [versionSchema],

    nocDoc: {
      // type: String,
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

module.exports = mongoose.model(
  "ContractorApplication",
  contractorApplicationSchema,
);
