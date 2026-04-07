const mongoose = require("mongoose");

const contractorApplicationSchema = new mongoose.Schema(
  {
    plotNumber: {
      type: String,
      required: true,
    },

    buildingName: {
      type: String,
      required: true,
    },

    floorNumber: {
      type: String,
      required: true,
    },

    unitNumber: {
      type: String,
      required: true,
      trim: true,
    },

    unitType: {
      type: String,
      enum: ["Single Unit", "Redesign Unit"],
      required: true,
    },

    usageType: {
      type: String,
      required: true,
    },

    areaVariationSqm: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalUnitAreaSqm: {
      type: Number,
      required: true,
      min: 0,
    },

    hasMezzanine: {
      type: Boolean,
      default: false,
    },

    totalUnitAreaAfterMezzanineSqm: {
      type: Number,
      default: null,
      min: 0,
    },

    tenantName: {
      type: String,
      trim: true,
    },

    tenantMobile: {
      type: String,
      trim: true,
    },

    tenantEmail: {
      type: String,
      trim: true,
    },

    ejariDocument: {
      type: String,
      default: null,
    },

    appointmentLetter: {
      type: String,
      default: null,
    },

    fitOutDrawings: {
      type: String,
      default: null,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "ContractorApplication",
  contractorApplicationSchema,
);
