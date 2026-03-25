const mongoose = require("mongoose");

const policySchema = new mongoose.Schema(
  {
    policyType: {
      type: String,
      enum: ["Terms_Conditions", "Privacy_Policy", "Pricing_Policy"],
      required: true,
    },

    role: {
      type: String,
      enum: ["Landlord", "Contractor", "Employees"],
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    content: {
      type: String,
      required: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Policy", policySchema);
