import express from "express";
import { authRequired } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  updatePrivacy,
  privacySchema,
  getUserOnlineStatus,
} from "../controllers/privacyController.js";

const router = express.Router();

/* ================= GET MY PRIVACY ================= */
router.get("/", authRequired, async (req, res, next) => {
  try {
    const settings = await (
      await import("../models/PrivacySettings.js")
    ).default.findOne({ user: req.user._id }).lean();

    res.json(
      settings || {
        showProfile: true,
        showOnlineStatus: true,
        locationPermission: true,
      }
    );
  } catch (err) {
    next(err);
  }
});

/* ================= GET OTHER USER ONLINE ================= */
router.get(
  "/online/:userId",
  authRequired,
  getUserOnlineStatus
);

/* ================= UPDATE ================= */
router.put("/", authRequired, validate(privacySchema), updatePrivacy);

export default router;
