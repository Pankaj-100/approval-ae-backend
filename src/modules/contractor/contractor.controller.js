const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../user/user.model");
const Role = require("../role/role.model");

const ErrorHandler = require("../../../utils/errorHandler");
const catchAsync = require("../../../utils/catchAsyncError");
const sendEmail = require("../../../utils/sendEmail");
const { fetchUserPermissions } = require("../../../utils/rbacHelper");
const { generateAccessToken, generateRefreshToken } = require("../../../utils/token");
const { s3Uploadv2 } = require("../../../utils/s3");
const awsUrl = "https://creative-story.s3.us-east-1.amazonaws.com";

// Set role name constant for this controller
const ROLE_NAME = "CONTRACTOR";

/* ==============================
   UPLOAD DOCUMENT FILE TO S3
============================== */
exports.uploadDocumentFile = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Please upload a file",
    });
  }

  const uploadResult = await s3Uploadv2(req.file);
  const docUrl = `${awsUrl}/${uploadResult.Key}`;

  return res.status(200).json({
    success: true,
    data: { 
      docUrl,
      file_name: req.file.originalname,
      key: uploadResult.Key
    },
    message: "File uploaded successfully",
  });
});

/* ==============================
   REGISTER CONTRACTOR
============================== */
exports.register = catchAsync(async (req, res, next) => {
  const {
    name,
    email,
    mobile_number,
    password,
    confirm_password,
    company_name,
    trade_license_number,
    documents,
  } = req.body;


  if (!name || !email || !mobile_number || !password || !confirm_password || !company_name || !trade_license_number || !documents) {
    return next(new ErrorHandler("All fields including documents are required", 400));
  }

  if (password !== confirm_password) {
    return next(new ErrorHandler("Passwords do not match", 400));
  }

  // Get the CONTRACTOR role
  const role = await Role.findOne({ name: ROLE_NAME });
  if (!role) return next(new ErrorHandler("Role not found", 404));

  // Check if user with this email AND role already exists
  const existing = await User.findOne({ 
    email, 
    role: role._id,
    isDeleted: false 
  });
  
  if (existing) {
    return next(new ErrorHandler(`${ROLE_NAME} with email ${email} already exists`, 409));
  }

  // Validate documents array
  const validTypes = ["trade_license", "dm_prequalification"];
  const hasTradeLicense = documents.some(d => d.document_type === "trade_license");
  const hasDMPrequalification = documents.some(d => d.document_type === "dm_prequalification");

  if (!hasTradeLicense || !hasDMPrequalification) {
    return next(new ErrorHandler("Both Trade License and DM Prequalification documents are required", 400));
  }

  for (const doc of documents) {
    if (!doc.file_url || !doc.document_type || !validTypes.includes(doc.document_type)) {
      return next(new ErrorHandler("Invalid documents array format", 400));
    }
    if (!doc.file_name) doc.file_name = "document";
  }

  // const otp = Math.floor(1000 + Math.random() * 9000).toString();
  
  const otp = "1234";

  const user = await User.create({
    name,
    email,
    mobile_number,
    company_name,
    trade_license_number,
    password,
    role: role._id,
    otp,
    otpExpire: Date.now() + 10 * 60 * 1000,
    documents,
  });

  user.isProfileCompleted = true;
  await user.save();

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
    role: ROLE_NAME,
    documents: user.documents,
    isProfileCompleted: user.isProfileCompleted,
  });
});

/* ==============================
   VERIFY EMAIL
============================== */
exports.verifyEmail = catchAsync(async (req, res, next) => {
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

  if (user.isVerified) {
    return next(new ErrorHandler("Email is already verified", 400));
  }

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
    isVerified: true,
    role: ROLE_NAME
  });
});

/* =====================================
   RESEND VERIFICATION OTP
===================================== */
exports.resendVerificationOtp = catchAsync(async (req, res, next) => {
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
    return next(new ErrorHandler(`${ROLE_NAME} with email ${email} not found`, 404));
  }

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
   LOGIN
===================================== */
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  const role = await Role.findOne({ name: ROLE_NAME });

  const user = await User.findOne({
    email,
    role: role._id,
    isDeleted: false,
  }).select("+password");

  if (!user) return next(new ErrorHandler("Invalid credentials", 401));

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return next(new ErrorHandler("Invalid credentials", 401));

  if (!user.isVerified) {
    // const otp = Math.floor(1000 + Math.random() * 9000).toString();
       const otp ="1234";
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
      verification_required: true,
      message: "Email not verified. OTP sent.",
      role: ROLE_NAME
    });
  }

  // Fetch RBAC permissions
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
      isProfileCompleted: user.isProfileCompleted,
      documents: user.documents,
      company_name: user.company_name,
      mobile_number: user.mobile_number,
    },
  });
});

/* =====================================
   SEND FORGOT PASSWORD OTP
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
   VERIFY FORGOT PASSWORD OTP
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
   RESEND FORGOT PASSWORD OTP
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
   RESET PASSWORD
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
    isDeleted: false,
  });

  if (!user) {
    return next(new ErrorHandler("Invalid or expired reset token", 400));
  }

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();

  await sendEmail(
    user.name,
    user.email,
    `<h3>${ROLE_NAME} Account - Password Reset Successful</h3>
     <p>Your password has been reset successfully.</p>
     <p>If you didn't perform this action, please contact support immediately.</p>`
  );

  res.json({ 
    success: true,
    message: `Password reset successfully for ${ROLE_NAME} account`,
    role: ROLE_NAME
  });
});

/* =====================================
   GET PROFILE
===================================== */
exports.getProfile = catchAsync(async (req, res) => {
  res.json({
    success: true,
    data: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      mobile_number: req.user.mobile_number,
      company_name: req.user.company_name,
      trade_license_number: req.user.trade_license_number,
      address: req.user.address,
      role: ROLE_NAME,
      documents: req.user.documents,
      isVerified: req.user.isVerified,
      isProfileCompleted: req.user.isProfileCompleted,
    },
  });
});

/* =====================================
   UPDATE PROFILE
===================================== */
exports.updateProfile = catchAsync(async (req, res) => {
  const { name, mobile_number, company_name, trade_license_number, address, email } = req.body;

  let emailChanged = false;

  if (email && email !== req.user.email) {
    emailChanged = true;
    req.user.email = email;
    req.user.isVerified = false;

    // const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const otp = "1234";
    req.user.otp = otp;
    req.user.otpExpire = Date.now() + 10 * 60 * 1000;
  }

  if (name) req.user.name = name;
  if (mobile_number) req.user.mobile_number = mobile_number;
  if (company_name) req.user.company_name = company_name;
  if (trade_license_number) req.user.trade_license_number = trade_license_number;
  if (address) req.user.address = address;

  await req.user.save();

  if (emailChanged) {
    await sendEmail(
      req.user.name, 
      req.user.email, 
      `<h3>${ROLE_NAME} Account - Email Change Verification</h3>
       <p>Your OTP to verify your new email is: <b>${req.user.otp}</b></p>
       <p>This OTP will expire in 10 minutes.</p>`
    );
  }

  res.json({
    success: true,
    message: "Profile updated successfully",
    verification_required: emailChanged,
    isVerified: req.user.isVerified,
    user: {
      name: req.user.name,
      email: req.user.email,
      mobile_number: req.user.mobile_number,
      company_name: req.user.company_name,
      trade_license_number: req.user.trade_license_number,
      address: req.user.address,
      role: ROLE_NAME,
    },
  });
});

/* =====================================
   GET ALL DOCUMENTS
===================================== */
exports.getDocuments = catchAsync(async (req, res) => {
  res.json({ 
    success: true, 
    documents: req.user.documents,
    isProfileCompleted: req.user.isProfileCompleted
  });
});

exports.saveAndSubmitDocuments = catchAsync(async (req, res, next) => {
  const { documents } = req.body;

  if (!documents || !Array.isArray(documents) || documents.length === 0) {
    return next(new ErrorHandler("Documents array is required", 400));
  }

  const validTypes = ["trade_license", "dm_prequalification"];
  const processedDocuments = [];

  // Validate and process incoming documents
  for (const doc of documents) {
    if (!doc.document_type || !validTypes.includes(doc.document_type)) {
      return next(new ErrorHandler(`Invalid document type: ${doc.document_type}. Allowed types: trade_license, dm_prequalification`, 400));
    }

    if (!doc.file_url) {
      return next(new ErrorHandler(`File URL is required for ${doc.document_type}`, 400));
    }

    processedDocuments.push({
      document_type: doc.document_type,
      file_url: doc.file_url,
      file_name: doc.file_name || `${doc.document_type}.pdf`,
      uploaded_at: new Date()
    });
  }

  // Save/update documents (allow partial updates)
  for (const newDoc of processedDocuments) {
    const existingDocIndex = req.user.documents.findIndex(
      doc => doc.document_type === newDoc.document_type
    );

    if (existingDocIndex >= 0) {
      // UPDATE existing document
      req.user.documents[existingDocIndex].file_url = newDoc.file_url;
      req.user.documents[existingDocIndex].file_name = newDoc.file_name;
      req.user.documents[existingDocIndex].uploaded_at = newDoc.uploaded_at;
    } else {
      // ADD new document
      req.user.documents.push(newDoc);
    }
  }

  // Check current document status
  const hasTradeLicense = req.user.documents.some(doc => doc.document_type === "trade_license");
  const hasDMPrequalification = req.user.documents.some(doc => doc.document_type === "dm_prequalification");
  
  // Determine if profile can be completed (both documents exist)
  const canCompleteProfile = hasTradeLicense && hasDMPrequalification;

  // Prepare response message
  let message = "Documents saved successfully";
  if (!hasTradeLicense || !hasDMPrequalification) {
    message = "Documents saved. Please upload both required documents to complete profile.";
  } else if (canCompleteProfile && !req.user.isProfileCompleted) {
    message = "All required documents uploaded. Profile completed!";
  }

  // Auto-complete profile if both documents exist
  if (canCompleteProfile) {
    req.user.isProfileCompleted = true;
  }

  await req.user.save();

  res.json({ 
    success: true, 
    message,
    documents: req.user.documents,
    isProfileCompleted: req.user.isProfileCompleted,
    hasRequiredDocuments: hasTradeLicense && hasDMPrequalification,
    missingDocuments: {
      trade_license: !hasTradeLicense,
      dm_prequalification: !hasDMPrequalification
    }
  });
});
/* =====================================
   DELETE DOCUMENT
===================================== */
exports.deleteDocument = catchAsync(async (req, res, next) => {
  const { documentId } = req.params;

  const documentIndex = req.user.documents.findIndex(
    doc => doc._id.toString() === documentId
  );

  if (documentIndex === -1) {
    return next(new ErrorHandler("Document not found", 404));
  }

  req.user.documents.splice(documentIndex, 1);

  const hasTradeLicense = req.user.documents.some(doc => doc.document_type === "trade_license");
  const hasDMPrequalification = req.user.documents.some(doc => doc.document_type === "dm_prequalification");
  req.user.isProfileCompleted = hasTradeLicense && hasDMPrequalification;

  await req.user.save();

  res.json({ 
    success: true,
    message: "Document deleted successfully", 
    documents: req.user.documents,
    isProfileCompleted: req.user.isProfileCompleted 
  });
});



/* =====================================
   CHANGE PASSWORD
===================================== */
exports.changePassword = catchAsync(async (req, res, next) => {
  const { old_password, new_password } = req.body;
  const user = await User.findById(req.user._id).select("+password");
  const isMatch = await bcrypt.compare(old_password, user.password);
  if (!isMatch) return next(new ErrorHandler("Incorrect password", 400));
  user.password = new_password;
  await user.save();
  
  await sendEmail(
    user.name,
    user.email,
    `<h3>${ROLE_NAME} Account - Password Changed</h3>
     <p>Your password has been changed successfully.</p>
     <p>If you didn't perform this action, please contact support immediately.</p>`
  );
  
  res.json({ success: true, message: "Password changed successfully" });
});

/* =====================================
   DELETE ACCOUNT
===================================== */
exports.deleteAccount = catchAsync(async (req, res, next) => {
  const { password } = req.body;
  const user = await User.findById(req.user._id).select("+password");
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return next(new ErrorHandler("Incorrect password", 400));
  user.isDeleted = true;
  user.refreshToken = null;
  await user.save();
  res.json({ success: true, message: "Account deleted successfully" });
});

/* =====================================
   LOGOUT
===================================== */
exports.logout = catchAsync(async (req, res) => {
  req.user.refreshToken = null;
  await req.user.save();
  res.json({ success: true, message: "Logged out successfully" });
});

/* =====================================
   GET PROFILE IMAGE
   Get current profile image URL
===================================== */
exports.getProfileImage = catchAsync(async (req, res) => {
  res.json({
    success: true,
    data: {
      profile_image_url: req.user.profile_image_url || null
    }
  });
});

/* =====================================
   UPDATE PROFILE IMAGE
   Upload or update profile image
===================================== */
exports.updateProfileImage = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new ErrorHandler("Please upload an image file", 400));
  }

  // Upload to S3 with specific folder for profile images
  const uploadResult = await s3Uploadv2(req.file, "contractor-profile");
  const imageUrl = `${awsUrl}/${uploadResult.Key}`;

  // Save the image URL to user profile
  req.user.profile_image_url = imageUrl;
  await req.user.save();

  res.json({
    success: true,
    message: "Profile image updated successfully",
    data: {
      profile_image_url: imageUrl
    }
  });
});

/* =====================================
   REMOVE PROFILE IMAGE
   Remove profile image from user profile
===================================== */
exports.removeProfileImage = catchAsync(async (req, res, next) => {
  // Check if user has a profile image
  if (!req.user.profile_image_url) {
    return next(new ErrorHandler("No profile image to remove", 400));
  }

  // Remove the image URL from user profile
  req.user.profile_image_url = null;
  await req.user.save();

  res.json({
    success: true,
    message: "Profile image removed successfully"
  });
});

