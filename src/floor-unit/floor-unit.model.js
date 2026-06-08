const mongoose = require("mongoose");

const unitSchema = new mongoose.Schema(
  {
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

    unitId: {
      type: String,
      required: true,
      trim: true,
    },

    tenantName: {
      type: String,
      default: null,
      trim: true,
    },

    usageType: {
      type: String,
      required: true,
    },

    fitOutWork: {
      type: String,
      required: true,
    },

    totalSqm: {
      type: Number,
      required: true,
      min: 0,
    },

    availableSqm: {
      type: Number,
      min: 0,
      default: 0,
    },

    usedSqm: {
      type: Number,
      min: 0,
      default: 0,
    },

    status: {
      type: String,
      enum: ["AVAILABLE", "CONSUMED"],
      default: "AVAILABLE",
    },

    parentUnits: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Unit",
      },
    ],

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Unit", unitSchema);
