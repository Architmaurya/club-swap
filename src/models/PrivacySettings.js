import mongoose from "mongoose";

const privacySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true },
    showProfile: { type: Boolean, default: true },
    showOnlineStatus: { type: Boolean, default: true },
    locationPermission: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model("PrivacySettings", privacySchema);
