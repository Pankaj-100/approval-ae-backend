const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    file: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      default: "PENDING",
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    rejectionReason: {
      type: String,
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false },
);

const workPermitSchema = new mongoose.Schema(
  {
    floorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FloorDetails",
      required: true,
    },

    floorUnitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      required: true,
    },

    documents: {
      dcd: fileSchema,
      dewaApproval: fileSchema,
      dmDdaDrawings: fileSchema,
      subcontractorUndertaking: fileSchema,
      carInsurance: fileSchema,
      workmenCompensationInsurance: fileSchema,
      emiratesId: fileSchema,
      commonAreaProtection: fileSchema,
      securityCheque: fileSchema,
    },

    overallStatus: {
      type: String,
      default: "PENDING",
    },

    submittedAt: {
      type: Date,
      default: Date.now,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("WorkPermit", workPermitSchema);

// const mongoose = require("mongoose");

// const fileVersionSchema = new mongoose.Schema(
//   {
//     versionNumber: {
//       type: Number,
//       required: true,
//     },

//     fileUrl: {
//       type: String,
//       required: true,
//     },

//     fileName: String,

//     uploadedBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },

//     uploadedAt: {
//       type: Date,
//       default: Date.now,
//     },

//     status: {
//       type: String,
//       enum: ["PENDING", "APPROVED", "REJECTED"],
//       default: "PENDING",
//     },

//     approvedBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       default: null,
//     },

//     approvedAt: Date,

//     rejectionReason: String,

//     isLatest: {
//       type: Boolean,
//       default: true,
//     },
//   },
//   { _id: false },
// );

// const workPermitSchema = new mongoose.Schema(
//   {
//     contractorApplicationId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "ContractorApplication",
//       required: true,
//     },

//     floorId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "FloorDetails",
//     },

//     floorUnitId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Unit",
//     },

//     documents: {
//       dcd: [fileVersionSchema],
//       dewaApproval: [fileVersionSchema],
//       dmDdaDrawings: [fileVersionSchema],
//       subcontractorUndertaking: [fileVersionSchema],
//       carInsurance: [fileVersionSchema],
//       workmenCompensationInsurance: [fileVersionSchema],
//       emiratesId: [fileVersionSchema],
//       commonAreaProtection: [fileVersionSchema],
//       securityCheque: [fileVersionSchema],
//     },

//     overallStatus: {
//       type: String,
//       default: "PENDING",
//     },

//     isDeleted: {
//       type: Boolean,
//       default: false,
//     },
//   },
//   { timestamps: true },
// );

// workPermitSchema.index(
//   { contractorApplicationId: 1 },
//   { unique: true, partialFilterExpression: { isDeleted: false } },
// );

// module.exports = mongoose.model("WorkPermit", workPermitSchema);
