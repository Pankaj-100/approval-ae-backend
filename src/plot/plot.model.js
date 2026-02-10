const mongoose = require("mongoose");

const plotDetailsSchema = new mongoose.Schema(
  {
    plotNumber: {
      type: Number,
      required: true,
      unique: true,
    },

    buildingName: {
      type: String,
      required: true,
    },

    buildingSqft: {
      type: Number,
      default: null,
      required: true,
    },

    buildingUsage: [
      {
        type: String,
        enum: ["Residential", "Commercial", "Industrial", "Other"],
        required: true,
      },
    ],

    documents: {
      siteAffectionPlan: {
        type: String,
        default: null,
        // required: true,
      },
      dmCompletionCertificate: {
        type: String,
        default: null,
        // required: true,
      },
      civilDefenseCertificate: {
        type: String,
        default: null,
        // required: true,
      },
      amcContract: {
        type: String,
        default: null,
        // required: true,
      },
      dewaApprovedLoadSchedule: {
        type: String,
        default: null,
        // required: true,
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
