const express = require("express");
const controller = require("./contractor.controller");
const { auth } = require("../../../middleware/auth");
const { upload } = require("../../../utils/s3");

const router = express.Router();

/* ----------------- AUTH ----------------- */
router.post("/auth/register", controller.register);
router.post("/auth/verify-email", controller.verifyEmail);
router.post("/auth/resend-verification-otp", controller.resendVerificationOtp);
router.post("/auth/login", controller.login);

// FORGOT PASSWORD FLOW (3 steps)
router.post("/auth/forgot-password/send-otp", controller.sendForgotPasswordOtp);    // Step 1: Send OTP
router.post("/auth/forgot-password/verify-otp", controller.verifyForgotPasswordOtp); // Step 2: Verify OTP (NEW)
router.post("/auth/forgot-password/resend-otp", controller.resendForgotPasswordOtp); // Resend OTP
router.post("/auth/reset-password", controller.resetPassword);                       // Step 3: Reset password with token

router.post("/auth/logout", auth, controller.logout);

/* ----------------- PROFILE ----------------- */
router.get("/profile", auth, controller.getProfile);
router.put("/profile", auth, controller.updateProfile);
router.put("/change-password", auth, controller.changePassword);
router.delete("/delete-account", auth, controller.deleteAccount);

/* ----------------- DOCUMENTS ----------------- */
router.post(
  "/documents/upload",

  upload.single("file"),
  controller.uploadDocumentFile
);

router.get("/documents", auth, controller.getDocuments);
router.post("/documents/save-changes", auth, controller.saveAndSubmitDocuments);
router.delete("/documents/:documentId", auth, controller.deleteDocument);

// PROFILE IMAGE ROUTES (Simplified)
router.get("/profile/image", auth, controller.getProfileImage);
router.post("/profile/image", auth, upload.single("file"), controller.updateProfileImage);
router.delete("/profile/image", auth, controller.removeProfileImage);


module.exports = router;