const mongoose = require("mongoose");

// Sub-schema for a single document's version history
const documentVersionSchema = new mongoose.Schema(
  {
    versionNumber: {
      type: Number,
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    remarks: {
      type: String,
      default: null,
    },
  },
  { _id: false },
);

const versionSchema = new mongoose.Schema(
  {
    versionNumber: {
      type: Number,
      required: true,
    },

    usageType: { type: String },
    totalUnitAreaSqm: { type: Number },
    areaVariationSqm: { type: Number },
    hasMezzanine: { type: Boolean },
    totalUnitAreaAfterMezzanineSqm: { type: Number },

    tenantName: { type: String },
    tenantMobile: { type: String },
    tenantEmail: { type: String },

    //Each document now maintains its own version history
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

    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      required: true,
    },

    plotNumber: {
      type: String,
    },

    buildingName: {
      type: String,
    },

    buildingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BuildingDetails",
      required: true,
    },

    floorNumber: {
      type: String,
    },
    unitNumber: {
      type: String,
    },

    unitType: {
      type: String,
      enum: ["Single Unit", "Redesign Unit"],
      default: "Single Unit",
    },

    currentVersion: {
      type: Number,
      default: 1,
    },

    versions: [versionSchema],

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

contractorApplicationSchema.index(
  { unitId: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);

module.exports = mongoose.model(
  "ContractorApplication",
  contractorApplicationSchema,
);
