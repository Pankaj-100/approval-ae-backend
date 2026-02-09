const { StatusCodes } = require("http-status-codes");
const catchAsyncError = require("../../utils/catchAsyncError");
const ErrorHandler = require("../../utils/errorHandler");
const User = require("./user.model");
const UserVerify = require("./userVerify.model");
const verifyEmail = require("../templete/verifyEmail");
const bcrypt = require("bcryptjs");

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
};

// Hash password
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// Compare password
const comparePassword = async (enteredPassword, storedPassword) => {
  return await bcrypt.compare(enteredPassword, storedPassword);
};

// Register User
exports.registerUser = catchAsyncError(async (req, res, next) => {
  const { name, email, phone, password, address, preferredLanguage } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    if (!existingUser.verified) {
      return next(
        new ErrorHandler(
          "User is already registered but not verified!",
          StatusCodes.NOT_ACCEPTABLE
        )
      );
    } else {
      return next(
        new ErrorHandler(
          "User is already registered, please login!",
          StatusCodes.NOT_ACCEPTABLE
        )
      );
    }
  }

  // Check if email is in verification process
  const checkVerification = await UserVerify.findOne({ email });
  if (checkVerification) {
    return next(
      new ErrorHandler(
        "Verification OTP already sent to this email. Please verify or wait for OTP to expire.",
        StatusCodes.CONFLICT
      )
    );
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user
  const user = await User.create({
    name,
    email,
    phone,
    address: address || '',
    password: hashedPassword,
    preferredLanguage: preferredLanguage || 'English'
  });

  // Generate OTP and save to UserVerify
  const otp = generateOTP();
  const expireIn = new Date(Date.now() + 3 * 60 * 1000); // 3 mins

  await UserVerify.create({ 
    email, 
    otp, 
    expireIn 
  });

  // Send OTP via email
  await verifyEmail(name, email, otp);

  res.status(StatusCodes.OK).json({
    success: true,
    message: `OTP sent successfully to ${email}`,
    userId: user._id
  });
});

// Verify Registration Email
exports.verifyRegisterEmail = catchAsyncError(async (req, res, next) => {
  const { email, otp } = req.body;

  // Find verification record
  const verificationRecord = await UserVerify.findOne({ email });
  if (!verificationRecord) {
    return next(
      new ErrorHandler(
        `OTP not found for this email: ${email}`,
        StatusCodes.NOT_FOUND
      )
    );
  }

  // Check if OTP matches
  if (verificationRecord.otp !== otp) {
    return next(
      new ErrorHandler("Invalid OTP", StatusCodes.BAD_REQUEST)
    );
  }

  // Check if OTP is expired
  if (Date.now() > verificationRecord.expireIn.getTime()) {
    await UserVerify.deleteOne({ _id: verificationRecord._id });
    return next(
      new ErrorHandler("OTP has expired", StatusCodes.BAD_REQUEST)
    );
  }

  // Delete verification record
  await UserVerify.deleteOne({ _id: verificationRecord._id });

  // Update user as verified
  await User.findOneAndUpdate(
    { email },
    { 
      verified: true,
      otp: null,
      otpExpires: null 
    },
    { new: true }
  );

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Email verified successfully"
  });
});

// Resend OTP
exports.resendOtp = catchAsyncError(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(
      new ErrorHandler("Email is required", StatusCodes.BAD_REQUEST)
    );
  }

  // Check if user exists
  const user = await User.findOne({ email });
  if (!user) {
    return next(
      new ErrorHandler("User not found", StatusCodes.NOT_FOUND)
    );
  }

  if (user.verified) {
    return next(
      new ErrorHandler("User is already verified", StatusCodes.BAD_REQUEST)
    );
  }

  // Generate new OTP
  const otp = generateOTP();
  const expireIn = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes

  // Update or create verification record
  await UserVerify.findOneAndUpdate(
    { email },
    { otp, expireIn },
    { 
      upsert: true, // Create if doesn't exist
      new: true 
    }
  );

  // Send OTP via email
  await verifyEmail(user.name, email, otp);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "OTP sent successfully",
    expiresIn: "3 minutes"
  });
});

// User Login
exports.userLogin = catchAsyncError(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(
      new ErrorHandler('Email and password are required', StatusCodes.BAD_REQUEST)
    );
  }

  // Find user
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    return next(
      new ErrorHandler('User is not registered', StatusCodes.NOT_ACCEPTABLE)
    );
  }

  // Check if user is verified
  if (!user.verified) {
    return next(
      new ErrorHandler('User registered but not verified', StatusCodes.NOT_ACCEPTABLE)
    );
  }

  // Check password
  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    return next(
      new ErrorHandler('Invalid credentials', StatusCodes.UNAUTHORIZED)
    );
  }

  // TODO: Generate JWT token
  // const token = generateToken(user._id);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Login successful",
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      verified: user.verified
    }
    // token: token
  });
});

// Additional utility functions

// Check verification status
exports.checkVerificationStatus = catchAsyncError(async (req, res, next) => {
  const { email } = req.params;

  const user = await User.findOne({ email });
  if (!user) {
    return next(
      new ErrorHandler("User not found", StatusCodes.NOT_FOUND)
    );
  }

  res.status(StatusCodes.OK).json({
    success: true,
    verified: user.verified
  });
});

// Clear expired OTPs (cron job function)
exports.cleanupExpiredOTPs = catchAsyncError(async (req, res, next) => {
  const result = await UserVerify.deleteMany({
    expireIn: { $lt: new Date() }
  });

  console.log(`Cleaned up ${result.deletedCount} expired OTPs`);
  
  res.status(StatusCodes.OK).json({
    success: true,
    message: `Cleaned up ${result.deletedCount} expired OTPs`
  });
});