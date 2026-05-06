const mongoose = require("mongoose");

const pricingSchema = new mongoose.Schema(
  {
    pricePerSqFt: {
      type: Number,
      required: true,
      min: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Pricing", pricingSchema);
