const mongoose = require("mongoose");

const approvedDocumentSchema = new mongoose.Schema(
  {
    floorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FloorDetails",
      required: true,
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
