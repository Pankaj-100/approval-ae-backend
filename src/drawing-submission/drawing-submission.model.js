// const mongoose = require("mongoose");

// const fileSchema = new mongoose.Schema(
//   {
//     file: {
//       type: String,
//       default: null,
//     },

//     status: {
//       type: String,
//       default: "PENDING",
//     },

//     approvedBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       default: null,
//     },

//     rejectionReason: {
//       type: String,
//       default: null,
//     },

//     approvedAt: {
//       type: Date,
//       default: null,
//     },
//   },
//   { _id: false },
// );

// const drawingSubmissionSchema = new mongoose.Schema(
//   {
//     referenceNumber: {
//       type: String,
//       required: true,
//       unique: true,
//     },

//     floorId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "FloorDetails",
//       required: true,
//     },

//     floorUnitId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Unit",
//       required: true,
//     },

//     architectural: {
//       autoCad: fileSchema,
//       dwf: fileSchema,
//     },

//     mep: {
//       autoCad: fileSchema,
//       dwf: fileSchema,
//     },

//     structural: {
//       autoCad: fileSchema,
//       dwf: fileSchema,
//     },

//     isDeleted: {
//       type: Boolean,
//       default: false,
//     },

//     deletedAt: {
//       type: Date,
//       default: null,
//     },
//   },
//   { timestamps: true },
// );

// module.exports = mongoose.model("DrawingSubmission", drawingSubmissionSchema);

const mongoose = require("mongoose");

const fileVersionSchema = new mongoose.Schema(
  {
    versionNumber: {
      type: Number,
      required: true,
    },

    fileUrl: {
      type: String,
      required: true,
    },

    fileName: String,

    // uploadedBy: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "User",
    //   required: true,
    // },

    uploadedAt: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    approvedAt: Date,

    rejectionReason: String,

    isLatest: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false },
);

const drawingSubmissionSchema = new mongoose.Schema(
  {
    contractorApplicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ContractorApplication",
      required: true,
    },

    floorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FloorDetails",
    },

    floorUnitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
    },

    architectural: {
      autoCad: [fileVersionSchema],
      dwf: [fileVersionSchema],
    },

    mep: {
      autoCad: [fileVersionSchema],
      dwf: [fileVersionSchema],
    },

    structural: {
      autoCad: [fileVersionSchema],
      dwf: [fileVersionSchema],
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

drawingSubmissionSchema.index(
  { contractorApplicationId: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);

module.exports = mongoose.model("DrawingSubmission", drawingSubmissionSchema);
