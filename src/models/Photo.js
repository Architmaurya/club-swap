import mongoose from "mongoose";

const photoSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    order: { type: Number, min: 1, max: 6 }
  },
  { timestamps: true }
);

export default mongoose.model("Photo", photoSchema);
