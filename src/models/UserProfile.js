import mongoose from "mongoose";

const userProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true },
    name: { type: String, required: true },
    age: { type: Number, min: 18, max: 100, required: true },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: true
    },
    interestedIn: {
      type: String,
      enum: ["men", "women", "everyone"],
      required: true
    },
    about: { type: String, maxlength: 500 },
    city: { type: String, required: true },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }
    },
    favoriteClubs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Club" }],
    drinkingLevel: {
      type: String,
      enum: ["little", "moderate", "heavy"],
      default: "little"
    },
    splitBill: { type: Boolean, default: false },
    openForAfterparty: { type: Boolean, default: false }
  },
  { timestamps: true }
);

userProfileSchema.index({ location: "2dsphere" });

export default mongoose.model("UserProfile", userProfileSchema);
