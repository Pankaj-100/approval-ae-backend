const mongoose = require("mongoose");

const blockedSlotSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },

    slots: [
      {
        type: String,
        required: true,
      },
    ],
  },
  { _id: false },
);

const reviewerSlotSchema = new mongoose.Schema(
  {
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    blockedDates: {
      type: [blockedSlotSchema],
      default: [],
    },

    remarks: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ReviewerSlot", reviewerSlotSchema);
