const mongoose = require("mongoose");

const unitSchema = new mongoose.Schema(
  {
    plotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlotDetails",
    },

    floorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FloorDetails",
    },

    unitId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    tenantName: {
      type: String,
      trim: true,
      default: null,
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

    electricMeter: {
      type: String,
      trim: true,
      default: null,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Unit", unitSchema);
