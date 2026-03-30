const express = require("express");
const controller = require("./landlord.controller");
const { auth } = require("../../../middleware/auth");
const { upload } = require("../../../utils/s3");

const router = express.Router();

/* ----------------- AUTH ----------------- */
router.post("/auth/register", controller.register);
router.post("/auth/verify-email", controller.verifyEmail);
router.post("/auth/resend-verification-otp", controller.resendVerificationOtp);
router.post("/auth/login", controller.login);

// FORGOT PASSWORD FLOW (3 steps)
router.post("/auth/forgot-password/send-otp", controller.sendForgotPasswordOtp);
router.post(
  "/auth/forgot-password/verify-otp",
  controller.verifyForgotPasswordOtp,
);
router.post(
  "/auth/forgot-password/resend-otp",
  controller.resendForgotPasswordOtp,
);
router.post("/auth/reset-password", controller.resetPassword);

router.post("/auth/logout", auth, controller.logout);

/* ----------------- PROFILE ----------------- */
router.get("/profile", auth, controller.getProfile);
router.put("/profile", auth, controller.updateProfile);
router.post(
  "/profile/upload-photo",
  auth,
  upload.single("file"),
  controller.uploadPhoto,
);
router.delete("/profile/remove-photo", auth, controller.removePhoto);
// router.get("/profile/image", auth, controller.getProfileImage);
router.put("/change-password", auth, controller.changePassword);
router.delete("/delete-account", auth, controller.deleteAccount);

module.exports = router;
