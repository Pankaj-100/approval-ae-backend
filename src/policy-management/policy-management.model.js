const mongoose = require("mongoose");

const policySchema = new mongoose.Schema(
  {
    policyType: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      required: true,
    },

    subRoles: [
      {
        type: String,
      },
    ],

    title: {
      type: String,
      required: true,
      trim: true,
    },

    content: {
      type: String,
      required: true,
    },

    version: {
      type: Number,
      default: 1,
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
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Policy", policySchema);
