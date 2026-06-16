const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    contractorApplicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ContractorApplication",
      required: true,
    },

    inspectionDetailId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InspectionDetail",
      default: null,
    },

    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    contractorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    appointmentDate: {
      type: Date,
      required: true,
    },

    appointmentSlot: {
      type: String,
      required: true,
      trim: true,
    },

    document: {
      fileUrl: {
        type: String,
      },

      fileName: {
        type: String,
      },
    },

    remarks: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["SCHEDULED", "COMPLETED", "CANCELLED", "RESCHEDULED"],
      default: "SCHEDULED",
    },

    completedAt: {
      type: Date,
      default: null,
    },

    scheduledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    cancelledReason: {
      type: String,
      default: "",
    },

    rescheduledFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
    },

    appointmentType: {
      type: String,
      enum: ["DRAWING_REVIEW", "INSPECTION"],
      default: "DRAWING_REVIEW",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Appointment", appointmentSchema);
