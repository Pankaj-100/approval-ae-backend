const express = require("express");
const {
  login,
  sendForgotPasswordOtp,
  resendForgotPasswordOtp,
  verifyForgotPasswordOtp,
  resetPassword,
  changePassword,
  logout,
  getProfile,
  updateProfile,
  uploadPhoto,
  removePhoto,
  getProfileImage,
} = require("./auth.controller");

const { auth } = require("../../../middleware/auth");
const { upload } = require("../../../utils/s3");

const router = express.Router();

/* Common auth — works for SUPER_ADMIN, SUB_ADMIN, ARCHITECT, CONTRACTOR, LANDLORD, etc. */
router.post("/login", login);
router.post("/forgot-password/send-otp", sendForgotPasswordOtp);
router.post("/forgot-password/resend-otp", resendForgotPasswordOtp);
router.post("/forgot-password/verify-otp", verifyForgotPasswordOtp);
router.post("/reset-password", resetPassword);
router.post("/logout", auth, logout);
router.put("/change-password", auth, changePassword);

/* Profile */
router.get("/profile", auth, getProfile);
router.put("/profile", auth, updateProfile);
router.post("/profile/upload-photo", auth, upload.single("file"), uploadPhoto);
router.delete("/profile/remove-photo", auth, removePhoto);
router.get("/profile/image", auth, getProfileImage);

module.exports = router;
