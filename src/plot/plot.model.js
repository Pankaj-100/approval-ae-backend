const mongoose = require("mongoose");

const plotDetailsSchema = new mongoose.Schema(
  {
    plotNumber: {
      type: Number,
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

    buildingUsage: [
      {
        type: String,
        required: true,
      },
    ],

    documents: {
      siteAffectionPlan: {
        type: String,
        default: null,
      },
      dmCompletionCertificate: {
        type: String,
        default: null,
      },
      civilDefenseCertificate: {
        type: String,
        default: null,
      },
      amcContract: {
        type: String,
        default: null,
      },
      dewaApprovedLoadSchedule: {
        type: String,
        default: null,
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

module.exports = mongoose.model("PlotDetails", plotDetailsSchema);
