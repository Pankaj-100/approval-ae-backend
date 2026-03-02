const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const User = require("../user/user.model");
const Role = require("../role/role.model");

const ErrorHandler = require("../../../utils/errorHandler");
const catchAsync = require("../../../utils/catchAsyncError");
const sendEmail = require("../../../utils/sendEmail");
const { generateAccessToken, generateRefreshToken } = require("../../../utils/token");
const { s3Uploadv2 } = require("../../../utils/s3");

// Set role name constant for this controller
const ROLE_NAME = "LANDLORD";

/* ==============================
   REGISTER LANDLORD
============================== */
exports.register = catchAsync(async (req, res, next) => {
  const {
    username,
    company_name,
    email,
    mobile_number,
    password,
    confirm_password,
  } = req.body;

  // REQUIRED FIELDS CHECK
  if (!username || !email || !mobile_number || !password || !confirm_password) {
    return next(new ErrorHandler("All fields are required", 400));
  }

  if (password !== confirm_password) {
    return next(new ErrorHandler("Passwords do not match", 400));
  }

  // Get the LANDLORD role
  const role = await Role.findOne({ name: ROLE_NAME });
  if (!role) {
    return next(new ErrorHandler("Role not found", 404));
  }

  // Check if user with this email AND landlord role already exists
  const existing = await User.findOne({ 
    email, 
    role: role._id,
    isDeleted: false 
  });
  
  if (existing) {
    return next(new ErrorHandler(`${ROLE_NAME} with email ${email} already exists`, 409));
  }

  // const otp = Math.floor(1000 + Math.random() * 9000).toString();
  const otp = "1234";


  const user = await User.create({
    name: username,
    company_name,
    email,
    mobile_number,
    password,
    role: role._id,
    otp,
    otpExpire: Date.now() + 10 * 60 * 1000,
  });

  await sendEmail(
    user.name, 
    user.email, 
    `<h3>Welcome to ${ROLE_NAME} Portal!</h3>
     <p>Your email verification OTP is: <b>${otp}</b></p>
     <p>This OTP will expire in 10 minutes.</p>`
  );

  res.status(201).json({
    success: true,
    user_id: user._id,
    message: "Registration successful. OTP sent to email.",
    verification_required: true,
    role: ROLE_NAME
  });
});

/* =====================================
   VERIFY EMAIL (No role in body)
===================================== */
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
    isDeleted: false 
  });

  if (!user) {
    return next(new ErrorHandler(`${ROLE_NAME} with email ${email} not found`, 404));
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
    isVerified: true
  });
});

/* =====================================
   RESEND VERIFICATION OTP (No role in body)
===================================== */
exports.resendVerificationOtp = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new ErrorHandler("Email is required", 400));
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
    isDeleted: false 
  });

  if (!user) {
    return next(new ErrorHandler(`${ROLE_NAME} with email ${email} not found`, 404));
  }

  // Check if already verified
  if (user.isVerified) {
    return next(new ErrorHandler("Email is already verified", 400));
  }

  // const otp = Math.floor(1000 + Math.random() * 9000).toString();
  const otp = "1234";


  user.otp = otp;
  user.otpExpire = Date.now() + 10 * 60 * 1000;

  await user.save();

  await sendEmail(
    user.name, 
    user.email, 
    `<h3>${ROLE_NAME} Account - Email Verification OTP (Resent)</h3>
     <p>Your new OTP is: <b>${otp}</b></p>
     <p>This OTP will expire in 10 minutes.</p>
     <p>If you didn't request this, please ignore this email.</p>`
  );

  res.json({ 
    success: true,
    message: `Verification OTP resent successfully to ${email}`,
    verification_required: true,
    role: ROLE_NAME
  });
});

/* =====================================
   LOGIN (No role in body)
===================================== */
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

  // If email not verified → send OTP
  if (!user.isVerified) {
      // const otp = Math.floor(1000 + Math.random() * 9000).toString();
          const otp = "1234";

    user.otp = otp;
    user.otpExpire = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendEmail(
      user.name, 
      user.email, 
      `<h3>${ROLE_NAME} Account - Email Verification</h3>
       <p>Your OTP is: <b>${otp}</b></p>
       <p>This OTP will expire in 10 minutes.</p>`
    );

    return res.status(200).json({
      success: false,
      message: "Email not verified. OTP sent.",
      verification_required: true,
      role: ROLE_NAME
    });
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshToken = refreshToken;
  await user.save();

  res.json({
    success: true,
    token: accessToken,
    refreshToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: ROLE_NAME,
      isVerified: user.isVerified,
      company_name: user.company_name,
      mobile_number: user.mobile_number,
      profile_image_url: user.profile_image_url
    },
  });
});

/* =====================================
   SEND FORGOT PASSWORD OTP (No role in body)
===================================== */
exports.sendForgotPasswordOtp = catchAsync(async (req, res, next) => {
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
    isDeleted: false 
  });

  if (!user) {
    return next(new ErrorHandler(`${ROLE_NAME} with email ${email} not registered`, 404));
  }

  // const otp = Math.floor(1000 + Math.random() * 9000).toString();
  const otp = "1234";

  user.otp = otp;
  user.otpExpire = Date.now() + 10 * 60 * 1000;

  await user.save();

  await sendEmail(
    user.name, 
    user.email, 
    `<h3>${ROLE_NAME} Account - Password Reset OTP</h3>
     <p>Your OTP for password reset is: <b>${otp}</b></p>
     <p>This OTP will expire in 10 minutes.</p>
     <p>If you didn't request this, please ignore this email.</p>`
  );

  res.json({ 
    success: true,
    message: `Password reset OTP sent to ${email} for ${ROLE_NAME} account`,
    role: ROLE_NAME
  });
});

/* =====================================
   RESEND FORGOT PASSWORD OTP (No role in body)
===================================== */
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
    isDeleted: false 
  });

  if (!user) {
    return next(new ErrorHandler(`${ROLE_NAME} with email ${email} not registered`, 404));
  }

  // const otp = Math.floor(1000 + Math.random() * 9000).toString();
  const otp = "1234";
  user.otp = otp;
  user.otpExpire = Date.now() + 10 * 60 * 1000;

  await user.save();

  await sendEmail(
    user.name, 
    user.email, 
    `<h3>${ROLE_NAME} Account - Password Reset OTP (Resent)</h3>
     <p>Your new OTP for password reset is: <b>${otp}</b></p>
     <p>This OTP will expire in 10 minutes.</p>
     <p>If you didn't request this, please ignore this email.</p>`
  );

  res.json({ 
    success: true,
    message: `Password reset OTP resent successfully to ${email} for ${ROLE_NAME} account`,
    role: ROLE_NAME
  });
});

/* =====================================
   VERIFY FORGOT PASSWORD OTP (No role in body)
===================================== */
exports.verifyForgotPasswordOtp = catchAsync(async (req, res, next) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return next(new ErrorHandler("Email and OTP are required", 400));
  }

  const role = await Role.findOne({ name: ROLE_NAME });
  if (!role) {
    return next(new ErrorHandler("Role not found", 404));
  }

  const user = await User.findOne({ 
    email, 
    role: role._id,
    isDeleted: false 
  });

  if (!user) {
    return next(new ErrorHandler(`${ROLE_NAME} with email ${email} not found`, 404));
  }

  if (!user.otp || user.otp !== otp || user.otpExpire < Date.now()) {
    return next(new ErrorHandler("Invalid or expired OTP", 400));
  }

  const resetToken = crypto.randomBytes(20).toString("hex");

  user.resetPasswordToken = resetToken;
  user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
  user.otp = undefined;
  user.otpExpire = undefined;

  await user.save();

  res.json({ 
    success: true, 
    message: "OTP verified successfully",
    resetToken,
    role: ROLE_NAME
  });
});

/* =====================================
   RESET PASSWORD (No role in body)
===================================== */
exports.resetPassword = catchAsync(async (req, res, next) => {
  const { resetToken, newPassword } = req.body;

  if (!resetToken || !newPassword) {
    return next(new ErrorHandler("Reset token and new password are required", 400));
  }

  const role = await Role.findOne({ name: ROLE_NAME });
  if (!role) {
    return next(new ErrorHandler("Role not found", 404));
  }

  const user = await User.findOne({
    resetPasswordToken: resetToken,
    resetPasswordExpire: { $gt: Date.now() },
    role: role._id,
    isDeleted: false
  });

  if (!user) {
    return next(new ErrorHandler("Invalid or expired token", 400));
  }

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();

  // Send confirmation email
  await sendEmail(
    user.name,
    user.email,
    `<h3>${ROLE_NAME} Account - Password Reset Successful</h3>
     <p>Your password has been reset successfully.</p>
     <p>If you didn't perform this action, please contact support immediately.</p>`
  );

  res.json({ 
    success: true, 
    message: "Password reset successfully",
    role: ROLE_NAME
  });
});

/* =====================================
   GET PROFILE
===================================== */
exports.getProfile = catchAsync(async (req, res) => {
  const user = req.user;

  res.json({
    success: true,
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      mobile_number: user.mobile_number,
      address: user.address,
      company_name: user.company_name,
      profile_image_url: user.profile_image_url,
      role: ROLE_NAME,
      isVerified: user.isVerified
    }
  });
});

/* =====================================
   UPDATE PROFILE
===================================== */
exports.updateProfile = catchAsync(async (req, res) => {
  const user = req.user;
  const { name, email, mobile_number, company_name, address } = req.body;

  let emailChanged = false;

  if (email && email !== user.email) {
    emailChanged = true;
    user.email = email;
    user.isVerified = false;

    // const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const otp = "1234";
    user.otp = otp;
    user.otpExpire = Date.now() + 10 * 60 * 1000;
  }

  if (name) user.name = name;
  if (mobile_number) user.mobile_number = mobile_number;
  if (company_name) user.company_name = company_name;
  if (address) user.address = address;

  await user.save();

  // Send OTP after save if email changed
  if (emailChanged) {
    await sendEmail(
      user.name, 
      user.email, 
      `<h3>${ROLE_NAME} Account - Email Change Verification</h3>
       <p>Your OTP to verify your new email is: <b>${user.otp}</b></p>
       <p>This OTP will expire in 10 minutes.</p>`
    );
  }

  res.json({
    success: true,
    message: "Profile updated successfully",
    verification_required: emailChanged,
    isVerified: user.isVerified,
    user: {
      name: user.name,
      email: user.email,
      mobile_number: user.mobile_number,
      company_name: user.company_name,
      address: user.address,
      role: ROLE_NAME
    }
  });
});

/* =====================================
   UPLOAD PROFILE PHOTO
===================================== */
exports.uploadPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new ErrorHandler("Please upload a file", 400));
  }

  const result = await s3Uploadv2(req.file);

  req.user.profile_image_url = result.Location;
  await req.user.save();

  res.json({ 
    success: true, 
    avatarUrl: result.Location,
    message: "Photo uploaded successfully"
  });
});

/* =====================================
   REMOVE PROFILE PHOTO
===================================== */
exports.removePhoto = catchAsync(async (req, res) => {
  req.user.profile_image_url = null;
  await req.user.save();

  res.json({ 
    success: true,
    message: "Photo removed successfully" 
  });
});

/* =====================================
   CHANGE PASSWORD
===================================== */
exports.changePassword = catchAsync(async (req, res, next) => {
  const { old_password, new_password, confirm_password } = req.body;

  if (new_password !== confirm_password) {
    return next(new ErrorHandler("Passwords do not match", 400));
  }

  // Fetch password manually
  const user = await User.findById(req.user._id).select("+password");

  const isMatch = await bcrypt.compare(old_password, user.password);
  if (!isMatch) {
    return next(new ErrorHandler("Old password incorrect", 400));
  }

  user.password = new_password;
  await user.save();

  // Send confirmation email
  await sendEmail(
    user.name,
    user.email,
    `<h3>${ROLE_NAME} Account - Password Changed</h3>
     <p>Your password has been changed successfully.</p>
     <p>If you didn't perform this action, please contact support immediately.</p>`
  );

  res.json({ 
    success: true,
    message: "Password updated successfully" 
  });
});

/* =====================================
   DELETE ACCOUNT (SOFT DELETE)
===================================== */
exports.deleteAccount = catchAsync(async (req, res, next) => {
  const { password } = req.body;

  const user = await User.findById(req.user._id).select("+password");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return next(new ErrorHandler("Incorrect password", 400));
  }

  user.isDeleted = true;
  user.refreshToken = null;
  await user.save();

  res.json({ 
    success: true,
    message: "Account deleted successfully" 
  });
});

/* =====================================
   LOGOUT
===================================== */
exports.logout = catchAsync(async (req, res) => {
  req.user.refreshToken = null;
  await req.user.save();
  
  res.json({ 
    success: true,
    message: "Logged out successfully" 
  });
});