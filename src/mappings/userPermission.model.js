const mongoose = require("mongoose");

const userPermissionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    permission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Permission",
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Ensure one user can't have duplicate permissions
userPermissionSchema.index({ user: 1, permission: 1 }, { unique: true });

module.exports = mongoose.model("UserPermission", userPermissionSchema);
