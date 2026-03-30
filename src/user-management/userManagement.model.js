const mongoose = require("mongoose");

const userManagemnetSchema = new mongoose.Schema(
  {
    user_type: {
      type: String,
      enum: [
        "LANDLORD",
        "ARCHITECT",
        "CONTRACTOR",
        "ENGINEER",
        "OFFICE_ADMIN",
        "INSPECTION_AGENT",
      ],
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    mobile: {
      type: String,
      required: true,
    },

    verified_status: {
      type: String,
      enum: ["YES", "NO"],
      default: "YES",
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

module.exports = mongoose.model("UserManagement", userManagemnetSchema);
