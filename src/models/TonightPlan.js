import mongoose from "mongoose";

const tonightPlanSchema = new mongoose.Schema(
  {
    // 🔒 One plan per user (DB enforced)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,   // ✅ enough
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

    date: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("TonightPlan", tonightPlanSchema);
