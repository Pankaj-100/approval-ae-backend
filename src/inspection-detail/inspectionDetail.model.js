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

const inspectionDetailSchema = new mongoose.Schema(
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

    inspectionType: {
      type: String,
      default: "Final Inspection",
    },

    documents: {
      sitePhoto: fileSchema,
      dcdCompletionCertificate: fileSchema,
      dmCompletionCertificate: fileSchema,
      architecturalAsBuilt: fileSchema,
      mepAsBuilt: fileSchema,
      structuralAsBuilt: fileSchema,
      testCertificates: fileSchema,
      commonAreaDamageClearance: fileSchema,
      revisedAuthorityDrawings: fileSchema,
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

module.exports = mongoose.model("InspectionDetail", inspectionDetailSchema);
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

// const inspectionDetailSchema = new mongoose.Schema(
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

//     inspectionType: {
//       type: String,
//       default: "Final Inspection",
//     },

//     documents: {
//       sitePhoto: [fileVersionSchema],
//       dcdCompletionCertificate: [fileVersionSchema],
//       dmCompletionCertificate: [fileVersionSchema],
//       architecturalAsBuilt: [fileVersionSchema],
//       mepAsBuilt: [fileVersionSchema],
//       structuralAsBuilt: [fileVersionSchema],
//       testCertificates: [fileVersionSchema],
//       commonAreaDamageClearance: [fileVersionSchema],
//       revisedAuthorityDrawings: [fileVersionSchema],
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

// inspectionDetailSchema.index(
//   { contractorApplicationId: 1 },
//   { unique: true, partialFilterExpression: { isDeleted: false } },
// );

// module.exports = mongoose.model("InspectionDetail", inspectionDetailSchema);
