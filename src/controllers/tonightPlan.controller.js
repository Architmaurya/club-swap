import TonightPlan from "../models/TonightPlan.js";
import { log } from "../utils/logger.js";


/* ======================================================
   CREATE / UPDATE TONIGHT PLAN
   (ONE plan per user ONLY)
====================================================== */
export const upsertTonightPlan = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { club, arrivalTime, date } = req.body;

    // ---------------- VALIDATION ----------------
    if (!club || !arrivalTime || !date) {
      return res.status(400).json({
        message: "club, arrivalTime and date are required",
      });
    }

    // Normalize date (keep same day)
    const planDate = new Date(date);
    planDate.setHours(0, 0, 0, 0);

    // ---------------- UPSERT ----------------
    const plan = await TonightPlan.findOneAndUpdate(
      { user: userId }, // 🔥 ONLY ONE PLAN PER USER
      {
        user: userId,
        club,
        arrivalTime,
        date: planDate,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    ).populate("club");

    return res.status(200).json({
      message: "Tonight plan saved successfully",
      plan,
    });
  } catch (err) {
    log("❌ TONIGHT PLAN UPSERT ERROR:", err);

    // Handle unique constraint edge case
    if (err.code === 11000) {
      return res.status(409).json({
        message: "You already have a tonight plan",
      });
    }

    next(err);
  }
};

/* ======================================================
   GET TONIGHT PLAN (CURRENT)
====================================================== */
export const getTonightPlan = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const plan = await TonightPlan.findOne({
      user: userId,
    }).populate("club");

    return res.status(200).json({
      plan: plan || null,
    });
  } catch (err) {
    log("❌ GET TONIGHT PLAN ERROR:", err);
    next(err);
  }
};

/* ======================================================
   CANCEL TONIGHT PLAN
====================================================== */
export const cancelTonightPlan = async (req, res, next) => {
  try {
    const userId = req.user._id;

    await TonightPlan.findOneAndDelete({
      user: userId,
    });

    return res.status(200).json({
      message: "Tonight plan cancelled successfully",
    });
  } catch (err) {
    log("❌ CANCEL TONIGHT PLAN ERROR:", err);
    next(err);
  }
};
