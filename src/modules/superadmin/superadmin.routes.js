const express = require("express");
const {
  login,
  sendForgotPasswordOtp,
  resendForgotPasswordOtp,
  verifyForgotPasswordOtp,
  resetPassword,
  getProfile,
  updateProfile,
  uploadPhoto,
  removePhoto,
  changePassword,
  logout,
  createUser,
  getAllUsers,
} = require("./superadmin.controller");

const { auth } = require("../../../middleware/auth");
const { upload } = require("../../../utils/s3");

const router = express.Router();

/* ----------------- AUTH ----------------- */
router.post("/auth/login", login);
router.post("/auth/forgot-password/send-otp", sendForgotPasswordOtp);
router.post("/auth/forgot-password/resend-otp", resendForgotPasswordOtp);
router.post("/auth/forgot-password/verify-otp", verifyForgotPasswordOtp);
router.post("/auth/reset-password", resetPassword);
router.post("/auth/logout", auth, logout);

/* ----------------- USER MANAGEMENT ----------------- */
router.post("/users/create", auth, createUser);
router.get("/users", auth, getAllUsers);

/* ----------------- PROFILE ----------------- */
router.get("/profile", auth, getProfile);
router.put("/profile", auth, updateProfile);
router.post("/profile/upload-photo", auth, upload.single("file"), uploadPhoto);
router.delete("/profile/remove-photo", auth, removePhoto);
router.put("/change-password", auth, changePassword);

module.exports = router;