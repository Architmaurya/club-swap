import mongoose from "mongoose";

const matchSchema = new mongoose.Schema(
  {
    user1: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    user2: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  },
  { timestamps: true }
);

matchSchema.index({ user1: 1, user2: 1 }, { unique: true });

export default mongoose.model("Match", matchSchema);
