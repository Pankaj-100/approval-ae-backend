const mongoose = require("mongoose");

const slotTimingSchema = new mongoose.Schema(
  {
    startTime: {
      type: String,
      required: true,
      trim: true,
    },

    interval: {
      type: Number,
      required: true,
      min: 1,
    },

    numberOfSlots: {
      type: Number,
      required: true,
      min: 1,
    },

    slots: [
      {
        type: String,
        required: true,
      },
    ],

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

module.exports = mongoose.model("SlotTiming", slotTimingSchema);
