import mongoose from "mongoose";

const tonightPlanSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    club: { type: mongoose.Schema.Types.ObjectId, ref: "Club", required: true },
    arrivalTime: { type: String, required: true },
    date: { type: Date, required: true }
  },
  { timestamps: true }
);

export default mongoose.model("TonightPlan", tonightPlanSchema);
