const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const User = require("../user/user.model");
const Role = require("../role/role.model");

const ErrorHandler = require("../../../utils/errorHandler");
const catchAsync = require("../../../utils/catchAsyncError");
const sendEmail = require("../../../utils/sendEmail");
const { fetchUserPermissions } = require("../../../utils/rbacHelper");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../../../utils/token");
const { s3Uploadv2 } = require("../../../utils/s3");

const ROLE_NAME = "SUB_ADMIN";

/* ==============================
   LOGIN
============================== */
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  const role = await Role.findOne({ name: ROLE_NAME });

  const user = await User.findOne({
    email,
    role: role._id,
    isDeleted: false,
  }).select("+password");

  if (!user) {
    return next(new ErrorHandler("Invalid credentials", 401));
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return next(new ErrorHandler("Invalid credentials", 401));
  }

  const permissions = await fetchUserPermissions(user._id, user.role);

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshToken = refreshToken;
  await user.save();

  res.json({
    success: true,
    token: accessToken,
    refreshToken,
    permissions,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: ROLE_NAME,
      isVerified: user.isVerified,
      company_name: user.company_name,
      mobile_number: user.mobile_number,
      profile_image_url: user.profile_image_url,
    },
  });
});

/* ==============================
   FORGOT PASSWORD FLOW
============================== */

exports.sendForgotPasswordOtp = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  const role = await Role.findOne({ name: ROLE_NAME });

  const user = await User.findOne({
    email,
    role: role._id,
    isDeleted: false,
  });

  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  const otp = "1234";

  user.otp = otp;
  user.otpExpire = Date.now() + 10 * 60 * 1000;

  await user.save();

  await sendEmail(
    user.name,
    user.email,
    `<h3>Password Reset OTP</h3>
     <p>Your OTP is: <b>${otp}</b></p>`,
  );

  res.json({
    success: true,
    message: "OTP sent",
  });
});

exports.verifyForgotPasswordOtp = catchAsync(async (req, res, next) => {
  const { email, otp } = req.body;

  const role = await Role.findOne({ name: ROLE_NAME });

  const user = await User.findOne({
    email,
    role: role._id,
    isDeleted: false,
  });

  if (!user || user.otp !== otp || user.otpExpire < Date.now()) {
    return next(new ErrorHandler("Invalid OTP", 400));
  }

  const resetToken = crypto.randomBytes(20).toString("hex");

  user.resetPasswordToken = resetToken;
  user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
  user.otp = undefined;

  await user.save();

  res.json({
    success: true,
    resetToken,
  });
});

exports.resendForgotPasswordOtp = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new ErrorHandler("Email is required", 400));
  }

  const role = await Role.findOne({ name: ROLE_NAME });
  if (!role) {
    return next(new ErrorHandler("Role not found", 404));
  }

  const user = await User.findOne({
    email,
    role: role._id,
    isDeleted: false,
  });

  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  const otp = "1234";

  user.otp = otp;
  user.otpExpire = Date.now() + 10 * 60 * 1000;

  await user.save();

  await sendEmail(
    user.name,
    user.email,
    `<h3>Password Reset OTP (Resent)</h3>
     <p>Your new OTP is: <b>${otp}</b></p>
     <p>This OTP will expire in 10 minutes.</p>`,
  );

  res.json({
    success: true,
    message: "OTP resent successfully",
  });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const { resetToken, newPassword } = req.body;

  const role = await Role.findOne({ name: ROLE_NAME });

  const user = await User.findOne({
    resetPasswordToken: resetToken,
    resetPasswordExpire: { $gt: Date.now() },
    role: role._id,
    isDeleted: false,
  });

  if (!user) {
    return next(new ErrorHandler("Invalid token", 400));
  }

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();

  res.json({
    success: true,
    message: "Password reset successful",
  });
});

/* ==============================
   PROFILE
============================== */

exports.getProfile = catchAsync(async (req, res) => {
  const user = req.user;

  res.json({
    success: true,
    data: user,
  });
});

exports.updateProfile = catchAsync(async (req, res) => {
  const user = req.user;

  const { name, email, mobile_number, company_name, address } = req.body;

  if (name) user.name = name;
  if (email) user.email = email;
  if (mobile_number) user.mobile_number = mobile_number;
  if (company_name) user.company_name = company_name;
  if (address) user.address = address;

  await user.save();

  res.json({
    success: true,
    message: "Profile updated",
  });
});

/* ==============================
   PHOTO
============================== */

exports.uploadPhoto = catchAsync(async (req, res, next) => {
  const result = await s3Uploadv2(req.file);

  req.user.profile_image_url = result.Location;
  await req.user.save();

  res.json({
    success: true,
    avatarUrl: result.Location,
  });
});

exports.removePhoto = catchAsync(async (req, res) => {
  req.user.profile_image_url = null;
  await req.user.save();

  res.json({
    success: true,
  });
});

exports.getProfileImage = catchAsync(async (req, res) => {
  res.json({
    success: true,
    data: {
      profile_image_url: req.user.profile_image_url || null,
    },
  });
});

/* ==============================
   PASSWORD
============================== */

exports.changePassword = catchAsync(async (req, res, next) => {
  const { old_password, new_password } = req.body;

  const user = await User.findById(req.user._id).select("+password");

  const isMatch = await bcrypt.compare(old_password, user.password);
  if (!isMatch) {
    return next(new ErrorHandler("Wrong password", 400));
  }

  user.password = new_password;
  await user.save();

  res.json({
    success: true,
  });
});

/* ==============================
   DELETE + LOGOUT
============================== */

exports.deleteAccount = catchAsync(async (req, res) => {
  req.user.isDeleted = true;
  await req.user.save();

  res.json({
    success: true,
  });
});

exports.logout = catchAsync(async (req, res) => {
  req.user.refreshToken = null;
  await req.user.save();

  res.json({
    success: true,
  });
});

exports.verifyEmail = catchAsync(async (req, res, next) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return next(new ErrorHandler("Email and OTP are required", 400));
  }

  // Get the role from database
  const role = await Role.findOne({ name: ROLE_NAME });
  if (!role) {
    return next(new ErrorHandler("Role not found", 404));
  }

  // Find user with this email AND specific role
  const user = await User.findOne({
    email,
    role: role._id,
    isDeleted: false,
  });

  if (!user) {
    return next(
      new ErrorHandler(`${ROLE_NAME} with email ${email} not found`, 404),
    );
  }

  // Check if already verified
  if (user.isVerified) {
    return next(new ErrorHandler("Email is already verified", 400));
  }

  // Check if OTP is valid and not expired
  if (!user.otp || user.otp !== otp || user.otpExpire < Date.now()) {
    return next(new ErrorHandler("Invalid or expired OTP", 400));
  }

  user.isVerified = true;
  user.otp = undefined;
  user.otpExpire = undefined;

  await user.save();

  res.json({
    success: true,
    message: `${ROLE_NAME} email verified successfully`,
    account_status: "ACTIVE",
    role: ROLE_NAME,
    isVerified: true,
  });
});
