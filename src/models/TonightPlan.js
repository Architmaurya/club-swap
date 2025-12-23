import mongoose from "mongoose";

const tonightPlanSchema = new mongoose.Schema(
  {
    // 🔒 One plan per user (ENFORCED at DB level)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,     // ❗ prevents duplicates
      index: true,
    },

    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Club",
      required: true,
    },

    arrivalTime: {
      type: String,
      required: true,
      trim: true,
    },

    // For display / reference only (today or selected day)
    date: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// ✅ Safety index (extra guarantee)
tonightPlanSchema.index({ user: 1 }, { unique: true });

export default mongoose.model("TonightPlan", tonightPlanSchema);
