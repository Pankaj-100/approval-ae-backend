const mongoose = require("mongoose");

const permissionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: String,
    priority: {
      type: Number,
      enum: [0, 1, 2, 3, 4],
      default: 0
    },
    gates: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Gate"
      }
    ],
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Permission", permissionSchema);