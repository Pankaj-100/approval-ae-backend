const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const User = require("../user/user.model");
const Role = require("../role/role.model");

const ErrorHandler = require("../../../utils/errorHandler");
const catchAsync = require("../../../utils/catchAsyncError");
const sendEmail = require("../../../utils/sendEmail");
const { fetchUserPermissions } = require("../../../utils/rbacHelper");
const { generateAccessToken, generateRefreshToken } = require("../../../utils/token");
const { s3Uploadv2 } = require("../../../utils/s3");

// Set role name constant for this controller
const ROLE_NAME = "SUPER_ADMIN";

/* ===============================
   SUPERADMIN LOGIN
=================================*/
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

  // Fetch RBAC permissions
  const permissions = await fetchUserPermissions(user._id, user.role);

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshToken = refreshToken;
  await user.save();

  res.status(200).json({
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
    },
  });
});

/* ===============================
   SEND FORGOT PASSWORD OTP (No role in body)
=================================*/
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
    isDeleted: false,
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
    role: ROLE_NAME,
  });
});

/* ===============================
   RESEND FORGOT PASSWORD OTP (No role in body)
=================================*/
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
    role: ROLE_NAME,
  });
});

/* ===============================
   VERIFY FORGOT PASSWORD OTP (No role in body)
=================================*/
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
    isDeleted: false,
  });

  if (!user || user.otp !== otp || user.otpExpire < Date.now()) {
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
    role: ROLE_NAME,
  });
});

/* ===============================
   RESET PASSWORD (No role in body)
=================================*/
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
    isDeleted: false,
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
    role: ROLE_NAME,
  });
});

/* ===============================
   GET PROFILE
=================================*/
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
      profile_image_url: user.profile_image_url,
      role: ROLE_NAME,
      isVerified: user.isVerified,
    },
  });
});

/* ===============================
   UPDATE PROFILE
=================================*/
exports.updateProfile = catchAsync(async (req, res) => {
  const user = req.user;
  const { name, email, mobile_number, address } = req.body;

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
      address: user.address,
      role: ROLE_NAME,
    },
  });
});

/* ===============================
   UPLOAD PROFILE PHOTO
=================================*/
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
    message: "Photo uploaded successfully",
  });
});

/* ===============================
   REMOVE PHOTO
=================================*/
exports.removePhoto = catchAsync(async (req, res) => {
  req.user.profile_image_url = null;
  await req.user.save();

  res.json({
    success: true,
    message: "Photo removed successfully",
  });
});

/* ===============================
   CHANGE PASSWORD
=================================*/
exports.changePassword = catchAsync(async (req, res, next) => {
  const { old_password, new_password, confirm_password } = req.body;

  if (new_password !== confirm_password) {
    return next(new ErrorHandler("Passwords do not match", 400));
  }

  // Fetch password manually
  const user = await User.findById(req.user._id).select("+password");

  const isMatch = await bcrypt.compare(old_password, user.password);
  if (!isMatch) {
    return next(new ErrorHandler("Incorrect old password", 400));
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
    message: "Password updated successfully",
  });
});

/* ===============================
   LOGOUT
=================================*/
exports.logout = catchAsync(async (req, res) => {
  req.user.refreshToken = null;
  await req.user.save();

  res.json({
    success: true,
    message: "Logged out successfully",
  });
});

/* ===============================
   CREATE USER (SUPERADMIN)
   Can create: CONTRACTOR / LANDLORD
=================================*/
exports.createUser = catchAsync(async (req, res, next) => {
  const {
    name,
    email,
    mobile_number,
    role_name, // CONTRACTOR or LANDLORD
    company_name, // For CONTRACTOR
    trade_license_number, // For CONTRACTOR
  } = req.body;

  if (!role_name) {
    return next(new ErrorHandler("Role is required", 400));
  }

  // Check if role exists
  const role = await Role.findOne({
    name: role_name.toUpperCase(),
    isDeleted: false,
  });

  if (!role) {
    return next(new ErrorHandler("Invalid role", 400));
  }

  // Prevent creating SUPERADMIN
  if (role.name === ROLE_NAME) {
    return next(new ErrorHandler("Cannot create SUPERADMIN", 403));
  }

  // Check existing user with same email AND role
  const existingUser = await User.findOne({
    email,
    role: role._id,
    isDeleted: false,
  });

  if (existingUser) {
    return next(new ErrorHandler(`${role.name} with email ${email} already exists`, 409));
  }

  // Generate temporary password
  const tempPassword = Math.random().toString(36).slice(-8);

  // Create user data object
  const userData = {
    name,
    email,
    mobile_number,
    role: role._id,
    password: tempPassword,
    isVerified: true, // Admin created user doesn't need OTP
    isProfileCompleted: false, // Important for contractor flow
  };

  // Add contractor-specific fields if role is CONTRACTOR
  if (role.name === "CONTRACTOR") {
    if (!company_name) {
      return next(new ErrorHandler("Company name is required for CONTRACTOR", 400));
    }
    userData.company_name = company_name;
    userData.trade_license_number = trade_license_number;
  }

  // Add landlord-specific fields if role is LANDLORD
  if (role.name === "LANDLORD") {
    userData.company_name = company_name; // Optional for landlord
  }

  const user = await User.create(userData);

  // Send email with credentials
  await sendEmail(
    user.name,
    user.email,
    `<h3>Your ${role.name} account has been created</h3>
     <p><strong>Email:</strong> ${email}</p>
     <p><strong>Temporary Password:</strong> ${tempPassword}</p>
     <p><strong>Role:</strong> ${role.name}</p>
     ${role.name === "CONTRACTOR" ? `
     <p><strong>Company:</strong> ${company_name}</p>
     <p>Please login and upload your required documents (Trade License and DM Prequalification).</p>
     ` : ''}
     <p>Please login and change your password.</p>
     <p><a href="${process.env.FRONTEND_URL}/login">Login here</a></p>`
  );

  res.status(201).json({
    success: true,
    message: `${role.name} created successfully`,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      mobile_number: user.mobile_number,
      role: role.name,
      company_name: user.company_name,
      isProfileCompleted: user.isProfileCompleted,
    },
  });
});

/* ===============================
   GET ALL USERS (Optional - for superadmin dashboard)
=================================*/
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const { role_name, page = 1, limit = 10 } = req.query;

  const query = { isDeleted: false };
  
  if (role_name) {
    const role = await Role.findOne({ name: role_name.toUpperCase() });
    if (role) {
      query.role = role._id;
    }
  }

  const users = await User.find(query)
    .populate('role', 'name')
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .select('-password -refreshToken -otp -resetPasswordToken');

  const total = await User.countDocuments(query);

  res.json({
    success: true,
    data: users.map(user => ({
      id: user._id,
      name: user.name,
      email: user.email,
      mobile_number: user.mobile_number,
      role: user.role.name,
      company_name: user.company_name,
      isVerified: user.isVerified,
      isProfileCompleted: user.isProfileCompleted,
      createdAt: user.createdAt,
    })),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});