import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  deviceId: {
    type: String,
    required: true,
  },

  refreshToken: {
    type: String,
    required: true,
  },

  lastActive: {
    type: Date,
    default: Date.now,
  },

  revoked: {
    type: Boolean,
    default: false,
  },

}, { timestamps: true });

export default mongoose.model("Session", sessionSchema);
