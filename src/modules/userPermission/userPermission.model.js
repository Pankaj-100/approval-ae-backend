const mongoose = require("mongoose");

const userPermissionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    permissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Permission",
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("UserPermission", userPermissionSchema);