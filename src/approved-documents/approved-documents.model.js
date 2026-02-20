const mongoose = require("mongoose");

const approvedDocumentSchema = new mongoose.Schema(
  {
    floorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FloorDetails",
      required: true,
    },

    architecturalDrawing: {
      url: {
        type: String,
        default: null,
      },
      date: {
        type: Date,
        default: Date.now,
      },
    },

    structuralDrawing: {
      url: {
        type: String,
        default: null,
      },
      date: {
        type: Date,
        default: Date.now,
      },
    },

    mepDrawing: {
      url: {
        type: String,
        default: null,
      },
      date: {
        type: Date,
        default: Date.now,
      },
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

module.exports = mongoose.model("ApprovedDocument", approvedDocumentSchema);
