import express from "express";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

/* ===============================
   GET CURRENT USER (ME)
================================ */
router.get("/me", authRequired, (req, res) => {
  res.json({
    user: {
      _id: req.user._id,   // 🔥 REQUIRED
      id: req.user._id,    // (optional, keep if used elsewhere)
      email: req.user.email,
      role: req.user.role,
      isVip: req.user.isVip,
      isVipActive: req.user.isVipActive,
      vipPlan: req.user.vipPlan,
      vipExpiresAt: req.user.vipExpiresAt,
    },
  });
});


export default router;
