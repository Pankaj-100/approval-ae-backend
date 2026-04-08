const mongoose = require("mongoose");

const buildingSchema = new mongoose.Schema(
  {
    plotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlotDetails",
      required: true,
    },

    buildingName: {
      type: String,
      required: true,
    },

    buildingSqft: {
      type: Number,
      required: true,
    },

    buildingUsage: {
      type: String,
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("BuildingDetails", buildingSchema);
