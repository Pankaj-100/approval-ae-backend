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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateEmail = (email, next) => {
  if (!email || typeof email !== "string") {
    next(new ErrorHandler("Email is required", 400));
    return false;
  }
  if (email !== email.trim()) {
    next(new ErrorHandler("Email should not contain spaces", 400));
    return false;
  }
  if (email !== email.toLowerCase()) {
    next(new ErrorHandler("Email must be in lowercase", 400));
    return false;
  }
  if (!EMAIL_REGEX.test(email)) {
    next(new ErrorHandler("Enter a valid email address", 400));
    return false;
  }
  return true;
};

const validatePasswordStrength = (password, next, fieldLabel = "Password") => {
  if (!password || typeof password !== "string") {
    next(new ErrorHandler(`${fieldLabel} is required`, 400));
    return false;
  }
  if (password.length < 8) {
    next(
      new ErrorHandler(`${fieldLabel} must be at least 8 characters long`, 400),
    );
    return false;
  }
  if (password.length > 64) {
    next(new ErrorHandler(`${fieldLabel} is too long`, 400));
    return false;
  }
  return true;
};

// Finds a user by email only (role unknown upfront). Works for any role.
const findUserByEmailOnly = async (
  email,
  next,
  { selectPassword = false } = {},
) => {
  let query = User.find({ email, isDeleted: false }).populate("role", "name");
  if (selectPassword) query = query.select("+password");

  const users = await query;

  if (users.length === 0) {
    next(new ErrorHandler("No account found with this email", 404));
    return null;
  }

  if (users.length > 1) {
    next(
      new ErrorHandler(
        "Multiple accounts found with this email. Please contact support.",
        409,
      ),
    );
    return null;
  }

  return users[0];
};

/* ===========================================================
   LOGIN — works for any role
=========================================================== */
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!validateEmail(email, next)) return;
  if (!password || typeof password !== "string") {
    return next(new ErrorHandler("Password is required", 400));
  }

  const user = await findUserByEmailOnly(email, next, { selectPassword: true });
  if (!user) return;

  if (user.role && user.role.isDeleted) {
    return next(
      new ErrorHandler(
        "Your account access has been disabled. Contact support.",
        403,
      ),
    );
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return next(new ErrorHandler("Invalid email or password", 401));
  }

  const permissions = await fetchUserPermissions(user._id, user.role._id);

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshToken = refreshToken;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Login successful",
    token: accessToken,
    refreshToken,
    permissions,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role.name,
      isVerified: user.isVerified,
      isProfileCompleted: user.isProfileCompleted,
    },
  });
});

/* ===========================================================
   SEND FORGOT PASSWORD OTP — any role
=========================================================== */
exports.sendForgotPasswordOtp = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!validateEmail(email, next)) return;

  const user = await findUserByEmailOnly(email, next);
  if (!user) return;

  const otp = "1234"; // TODO: randomize in production
  user.otp = otp;
  user.otpExpire = Date.now() + 10 * 60 * 1000;
  await user.save();

  await sendEmail(
    user.name,
    user.email,
    `<h3>Password Reset OTP</h3>
     <p>Your OTP for password reset is: <b>${otp}</b></p>
     <p>This OTP will expire in 10 minutes.</p>
     <p>If you didn't request this, please ignore this email.</p>`,
  );

  res.status(200).json({
    success: true,
    message: `Password reset OTP sent to ${email}`,
  });
});

/* ===========================================================
   RESEND FORGOT PASSWORD OTP — any role
=========================================================== */
exports.resendForgotPasswordOtp = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!validateEmail(email, next)) return;

  const user = await findUserByEmailOnly(email, next);
  if (!user) return;

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

  res.status(200).json({
    success: true,
    message: `OTP resent successfully to ${email}`,
  });
});

/* ===========================================================
   VERIFY FORGOT PASSWORD OTP — any role
=========================================================== */
exports.verifyForgotPasswordOtp = catchAsync(async (req, res, next) => {
  const { email, otp } = req.body;

  if (!validateEmail(email, next)) return;
  if (!otp || typeof otp !== "string") {
    return next(new ErrorHandler("OTP is required", 400));
  }

  const user = await findUserByEmailOnly(email, next);
  if (!user) return;

  if (!user.otp || !user.otpExpire) {
    return next(
      new ErrorHandler("No OTP request found. Please request a new OTP.", 400),
    );
  }

  if (user.otpExpire < Date.now()) {
    return next(
      new ErrorHandler("OTP has expired. Please request a new one.", 400),
    );
  }

  if (user.otp !== otp.trim()) {
    return next(new ErrorHandler("Incorrect OTP", 400));
  }

  const resetToken = crypto.randomBytes(20).toString("hex");

  user.resetPasswordToken = resetToken;
  user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
  user.otp = undefined;
  user.otpExpire = undefined;

  await user.save();

  res.status(200).json({
    success: true,
    message: "OTP verified successfully",
    resetToken,
  });
});

/* ===========================================================
   RESET PASSWORD — token pins the user, any role
=========================================================== */
exports.resetPassword = catchAsync(async (req, res, next) => {
  const { resetToken, newPassword, confirmPassword } = req.body;

  if (!resetToken || typeof resetToken !== "string") {
    return next(new ErrorHandler("Reset token is required", 400));
  }
  if (!validatePasswordStrength(newPassword, next, "New password")) return;
  if (confirmPassword !== undefined && newPassword !== confirmPassword) {
    return next(new ErrorHandler("Passwords do not match", 400));
  }

  const user = await User.findOne({
    resetPasswordToken: resetToken,
    resetPasswordExpire: { $gt: Date.now() },
    isDeleted: false,
  }).select("+password");

  if (!user) {
    return next(new ErrorHandler("Reset token is invalid or has expired", 400));
  }

  const isSamePassword = await bcrypt.compare(newPassword, user.password);
  if (isSamePassword) {
    return next(
      new ErrorHandler("New password cannot be same as old password", 400),
    );
  }

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  user.refreshToken = null;
  await user.save();

  await sendEmail(
    user.name,
    user.email,
    `<h3>Password Reset Successful</h3>
     <p>Your password has been reset successfully.</p>
     <p>If you didn't perform this action, please contact support immediately.</p>`,
  );

  res
    .status(200)
    .json({ success: true, message: "Password reset successfully" });
});

/* ===========================================================
   CHANGE PASSWORD — logged in user, any role
=========================================================== */
exports.changePassword = catchAsync(async (req, res, next) => {
  const { old_password, new_password, confirm_password } = req.body;

  if (!old_password || typeof old_password !== "string") {
    return next(new ErrorHandler("Old password is required", 400));
  }
  if (!validatePasswordStrength(new_password, next, "New password")) return;
  if (new_password !== confirm_password) {
    return next(
      new ErrorHandler("New password and confirm password do not match", 400),
    );
  }
  if (old_password === new_password) {
    return next(
      new ErrorHandler("New password cannot be same as old password", 400),
    );
  }

  const user = req.user;
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  const isMatch = await bcrypt.compare(old_password, user.password);
  if (!isMatch) {
    return next(new ErrorHandler("Incorrect old password", 400));
  }

  user.password = new_password;
  await user.save();

  await sendEmail(
    user.name,
    user.email,
    `<h3>Password Changed</h3>
     <p>Your password has been changed successfully.</p>
     <p>If you didn't perform this action, please contact support immediately.</p>`,
  );

  res
    .status(200)
    .json({ success: true, message: "Password updated successfully" });
});

/* ===========================================================
   LOGOUT — any role
=========================================================== */
exports.logout = catchAsync(async (req, res) => {
  req.user.refreshToken = null;
  await req.user.save();

  res.status(200).json({ success: true, message: "Logged out successfully" });
});

/* ===========================================================
   PROFILE — get / update / photo, any role
=========================================================== */
exports.getProfile = catchAsync(async (req, res) => {
  const user = req.user;

  res.status(200).json({
    success: true,
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      mobile_number: user.mobile_number,
      address: user.address,
      company_name: user.company_name,
      profile_image_url: user.profile_image_url,
      role: user.role ? user.role.name : null,
      isVerified: user.isVerified,
      isProfileCompleted: user.isProfileCompleted,
    },
  });
});

exports.updateProfile = catchAsync(async (req, res, next) => {
  const user = req.user;
  const { name, email, mobile_number, address, company_name } = req.body;

  if (email !== undefined) {
    if (!validateEmail(email, next)) return;
  }
  if (name !== undefined && (!name.trim() || name.trim().length < 2)) {
    return next(new ErrorHandler("Name must be at least 2 characters", 400));
  }

  let emailChanged = false;

  if (email && email !== user.email) {
    const duplicate = await User.findOne({
      email,
      role: user.role,
      isDeleted: false,
      _id: { $ne: user._id },
    });
    if (duplicate) {
      return next(new ErrorHandler("This email is already in use", 409));
    }

    emailChanged = true;
    user.email = email;
    user.isVerified = false;

    const otp = "1234";
    user.otp = otp;
    user.otpExpire = Date.now() + 10 * 60 * 1000;
  }

  if (name) user.name = name.trim();
  if (mobile_number) user.mobile_number = mobile_number.trim();
  if (address) user.address = address.trim();
  if (company_name) user.company_name = company_name.trim();

  await user.save();

  if (emailChanged) {
    await sendEmail(
      user.name,
      user.email,
      `<h3>Email Change Verification</h3>
       <p>Your OTP to verify your new email is: <b>${user.otp}</b></p>
       <p>This OTP will expire in 10 minutes.</p>`,
    );
  }

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    verification_required: emailChanged,
    isVerified: user.isVerified,
  });
});

exports.uploadPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new ErrorHandler("Please upload a file", 400));
  }

  const result = await s3Uploadv2(req.file);

  req.user.profile_image_url = result.Location;
  await req.user.save();

  res.status(200).json({
    success: true,
    avatarUrl: result.Location,
    message: "Photo uploaded successfully",
  });
});

exports.removePhoto = catchAsync(async (req, res) => {
  req.user.profile_image_url = null;
  await req.user.save();

  res
    .status(200)
    .json({ success: true, message: "Photo removed successfully" });
});

exports.getProfileImage = catchAsync(async (req, res) => {
  res.status(200).json({
    success: true,
    data: { profile_image_url: req.user.profile_image_url || null },
  });
});
