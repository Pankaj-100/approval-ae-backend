// const mongoose = require("mongoose");

// const contractorApplicationSchema = new mongoose.Schema(
//   {
//     plotId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "PlotDetails",
//       required: true,
//       index: true,
//     },

//     floorId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "FloorDetails",
//       required: true,
//       index: true,
//     },

//     unitId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Unit",
//       required: true,
//       index: true,
//     },

//     plotNumber: String,
//     buildingName: String,
//     floorNumber: String,
//     unitNumber: String,

//     unitType: {
//       type: String,
//       enum: ["Single Unit", "Redesign Unit"],
//       default: "Single Unit",
//     },

//     usageType: {
//       type: String,
//       required: true,
//     },

//     areaVariationSqm: {
//       type: Number,
//       default: 0,
//       min: 0,
//     },

//     totalUnitAreaSqm: {
//       type: Number,
//       required: true,
//       min: 0,
//     },

//     hasMezzanine: {
//       type: Boolean,
//       default: false,
//     },

//     totalUnitAreaAfterMezzanineSqm: Number,

//     tenantName: String,
//     tenantMobile: String,
//     tenantEmail: String,

//     ejariDocument: String,
//     appointmentLetter: String,
//     fitOutDrawings: String,

//     status: {
//       type: String,
//       enum: ["PENDING", "APPROVED", "REJECTED"],
//       default: "PENDING",
//     },

//     isDeleted: {
//       type: Boolean,
//       default: false,
//     },
//   },
//   { timestamps: true },
// );

// contractorApplicationSchema.index({ unitId: 1 }, { unique: true });

// module.exports = mongoose.model(
//   "ContractorApplication",
//   contractorApplicationSchema,
// );

const mongoose = require("mongoose");

const versionSchema = new mongoose.Schema(
  {
    versionNumber: {
      type: Number,
      required: true,
    },

    usageType: {
      type: String,
    },

    totalUnitAreaSqm: {
      type: Number,
    },

    areaVariationSqm: {
      type: Number,
    },

    hasMezzanine: {
      type: Boolean,
    },
    totalUnitAreaAfterMezzanineSqm: {
      type: Number,
    },

    tenantName: {
      type: String,
    },
    tenantMobile: {
      type: String,
    },
    tenantEmail: {
      type: String,
    },

    documents: {
      ejariDocument: {
        type: String,
      },
      appointmentLetter: {
        type: String,
      },
      fitOutDrawings: {
        type: String,
      },
    },

    status: {
      type: String,
      enum: ["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"],
      default: "PENDING",
    },

    remarks: {
      type: String,
      default: null,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const contractorApplicationSchema = new mongoose.Schema(
  {
    plotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlotDetails",
      required: true,
    },

    floorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FloorDetails",
      required: true,
    },

    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      required: true,
      index: true,
    },

    plotNumber: {
      type: String,
    },
    buildingName: {
      type: String,
    },
    floorNumber: {
      type: String,
    },
    unitNumber: {
      type: String,
    },

    unitType: {
      type: String,
      enum: ["Single Unit", "Redesign Unit"],
      default: "Single Unit",
    },

    currentVersion: {
      type: Number,
      default: 1,
    },

    versions: [versionSchema],

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

contractorApplicationSchema.index({ unitId: 1 }, { unique: true });

module.exports = mongoose.model(
  "ContractorApplication",
  contractorApplicationSchema,
);
