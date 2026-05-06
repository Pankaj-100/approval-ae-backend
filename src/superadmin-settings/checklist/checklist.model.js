const mongoose = require("mongoose");

const checklistItemSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },

    order: {
      type: Number,
      required: true,
    },
  },
  { _id: true },
);

const checklistSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["inspection", "mep", "architectural", "structural"],
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    order: {
      type: Number,
      required: true,
    },

    items: {
      type: [checklistItemSchema],
      default: [],
    },
  },
  { timestamps: true },
);

checklistSchema.index({ type: 1, order: 1 });

module.exports = mongoose.model("Checklist", checklistSchema);
