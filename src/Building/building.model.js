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
      type: [String],
      required: true,
    },

    documents: {
      siteAffectionPlan: {
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

      dmCompletionCertificate: {
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

      civilDefenseCertificate: {
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

      amcContract: {
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

      dewaApprovedLoadSchedule: {
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
