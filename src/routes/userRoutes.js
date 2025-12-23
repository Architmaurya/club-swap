import express from "express";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

/* ===============================
   GET CURRENT USER (ME)
================================ */
router.get("/me", authRequired, (req, res) => {
  res.json({
    user: {
      id: req.user._id,
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
