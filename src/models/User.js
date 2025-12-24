import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    googleId: { type: String, index: true, sparse: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    name: String,
    avatar: String,
    role: { type: String, enum: ["user", "admin"], default: "user" },
    authProvider: { type: String, enum: ["google", "email"], required: true },

    isRegistered: { type: Boolean, default: false },

    isVip: { type: Boolean, default: false, index: true },
    vipPlan: { type: String, enum: ["monthly", "annual"] },
    vipActivatedAt: Date,
    vipExpiresAt: { type: Date, index: true },

    /* 🔥 REQUIRED FOR ONLINE STATUS */
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
  },
  { timestamps: true }
);


/* ===============================
   SINGLE ADMIN ENFORCEMENT
================================ */
userSchema.pre("save", async function (next) {
  if (this.role !== "admin") return next();

  const existingAdmin = await mongoose
    .model("User")
    .findOne({ role: "admin" });

  if (
    existingAdmin &&
    String(existingAdmin._id) !== String(this._id)
  ) {
    return next(new Error("Only one admin allowed"));
  }

  next();
});

export default mongoose.model("User", userSchema);
