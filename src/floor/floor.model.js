const mongoose = require("mongoose");

const floorDetailsSchema = new mongoose.Schema(
  {
    plotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlotDetails",
      required: true,
    },

    floorName: {
      type: String,
      required: true,
      trim: true,
    },

    totalFloorAreaSqm: {
      type: Number,
      required: true,
      min: 0,
    },

    circulationAreaSqm: {
      type: Number,
      required: true,
      min: 0,
    },

    architecturalDrawing: {
      type: String,
      default: null,
    },

    structuralDrawing: {
      type: String,
      default: null,
    },

    mepDrawing: {
      type: String,
      default: null,
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
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("FloorDetails", floorDetailsSchema);
