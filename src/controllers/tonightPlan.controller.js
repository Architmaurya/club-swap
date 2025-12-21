import TonightPlan from "../models/TonightPlan.js";

/* ======================================================
   CREATE / UPDATE TONIGHT PLAN
   (One plan per user per date)
====================================================== */
export const upsertTonightPlan = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { club, arrivalTime, date } = req.body;

    if (!club || !arrivalTime || !date) {
      return res.status(400).json({
        message: "club, arrivalTime and date are required",
      });
    }

    // Normalize date → only one plan per day
    const planDate = new Date(date);
    planDate.setHours(0, 0, 0, 0);

    const plan = await TonightPlan.findOneAndUpdate(
      { user: userId, date: planDate },
      {
        user: userId,
        club,
        arrivalTime,
        date: planDate,
      },
      {
        new: true,
        upsert: true, // 🔥 create if not exists
      }
    ).populate("club");

    res.status(200).json({
      message: "Tonight plan saved",
      plan,
    });
  } catch (err) {
    console.error("❌ TONIGHT PLAN UPSERT ERROR:", err);
    next(err);
  }
};

/* ======================================================
   GET TONIGHT PLAN (TODAY)
====================================================== */
export const getTonightPlan = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const plan = await TonightPlan.findOne({
      user: userId,
      date: today,
    }).populate("club");

    if (!plan) {
      return res.status(200).json({
        message: "No plan for tonight",
        plan: null,
      });
    }

    res.status(200).json({
      plan,
    });
  } catch (err) {
    console.error("❌ GET TONIGHT PLAN ERROR:", err);
    next(err);
  }
};


/* ======================================================
   CANCEL TONIGHT PLAN (NOT GOING OUT)
====================================================== */
export const cancelTonightPlan = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await TonightPlan.findOneAndDelete({
      user: userId,
      date: today,
    });

    res.status(200).json({
      message: "Tonight plan cancelled",
    });
  } catch (err) {
    console.error("❌ CANCEL TONIGHT PLAN ERROR:", err);
    next(err);
  }
};