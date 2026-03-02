const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const documentSchema = new mongoose.Schema({
  document_type: {
    type: String,
    enum: ["trade_license", "dm_prequalification"],
    required: true,
  },
  file_name: {
    type: String,
    required: true,
  },
  file_url: {
    type: String,
    required: true,
  },
  uploaded_at: {
    type: Date,
    default: Date.now,
  },
});

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    company_name: String,
    trade_license_number: String,

    email: {
      type: String,
      lowercase: true,
      required: true,
     
    },

    mobile_number: String,
    address: String,

    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    profile_image_url: String,

    documents: [documentSchema],

    isProfileCompleted: {
      type: Boolean,
      default: false,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    otp: String,
    otpExpire: Date,

    resetPasswordToken: String,
    resetPasswordExpire: Date,

    refreshToken: String,

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Create a compound unique index on email + role
// This ensures same email can be used with different roles
userSchema.index({ email: 1, role: 1 }, { unique: true });

// Also add index for isDeleted for better query performance
userSchema.index({ email: 1, role: 1, isDeleted: 1 });

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model("User", userSchema);