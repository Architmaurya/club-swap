// import express from "express";
// import {
//   googleLogin,
//   sendEmailOtp,
//   resendEmailOtp,
//   verifyEmailOtp,
// } from "../controllers/authController.js";

// const router = express.Router();

// /* --------------------------------------------------
//    GOOGLE LOGIN
// -------------------------------------------------- */
// router.post("/google", googleLogin);

// /* --------------------------------------------------
//    EMAIL + OTP LOGIN
// -------------------------------------------------- */
// router.post("/email/send-otp", sendEmailOtp);
// router.post("/email/resend-otp", resendEmailOtp);
// router.post("/email/verify-otp", verifyEmailOtp);

// export default router;

import express from "express";

import {
  googleLogin,
  sendEmailOtp,
  resendEmailOtp,
  verifyEmailOtp,
  refreshToken,
  logout,
  logoutAll,
} from "../controllers/authController.js";

import { authRequired } from "../middleware/auth.js";

const router = express.Router();

/* ======================================================
   GOOGLE LOGIN
====================================================== */
router.post("/google", googleLogin);

/* ======================================================
   EMAIL + OTP AUTH
====================================================== */
router.post("/email/send-otp", sendEmailOtp);
router.post("/email/resend-otp", resendEmailOtp);
router.post("/email/verify-otp", verifyEmailOtp);

/* ======================================================
   TOKEN
====================================================== */
router.post("/refresh-token", refreshToken);

/* ======================================================
   LOGOUT
====================================================== */
router.post("/logout", authRequired, logout);
router.post("/logout-all", authRequired, logoutAll);

export default router;
