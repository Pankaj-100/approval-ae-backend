const mongoose = require("mongoose");

const floorDetailsSchema = new mongoose.Schema(
  {
    buildingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BuildingDetails",
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
      type: {
        url: {
          type: String,
          default: null,
        },

        fileName: {
          type: String,
          default: null,
        },

        fileSize: {
          type: Number,
          default: null,
        },

        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
      default: {},
    },

    structuralDrawing: {
      type: {
        url: {
          type: String,
          default: null,
        },

        fileName: {
          type: String,
          default: null,
        },

        fileSize: {
          type: Number,
          default: null,
        },

        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
      default: {},
    },

    mepDrawing: {
      type: {
        url: {
          type: String,
          default: null,
        },

        fileName: {
          type: String,
          default: null,
        },

        fileSize: {
          type: Number,
          default: null,
        },

        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
      default: {},
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
floorDetailsSchema.index({ buildingId: 1, floorName: 1 }, { unique: true });

module.exports = mongoose.model("FloorDetails", floorDetailsSchema);
