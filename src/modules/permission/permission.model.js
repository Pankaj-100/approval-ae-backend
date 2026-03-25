const mongoose = require("mongoose");

const permissionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    gate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gate",
      required: true,
    },
    priority: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
      // Priority levels:
      // 1 = view/read
      // 2 = edit/update
      // 3 = delete
      // Higher number = more access
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Compound index to ensure unique permission per gate
permissionSchema.index({ gate: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Permission", permissionSchema);