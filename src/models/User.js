import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    /* ===============================
       AUTH / IDENTITY
    ================================ */
    googleId: {
      type: String,
      index: true,
      sparse: true, // ✅ allows multiple nulls
    },

    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },

    name: {
      type: String,
      trim: true,
    },

    avatar: {
      type: String,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    authProvider: {
      type: String,
      enum: ["google", "email"],
      required: true,
    },

    /* ===============================
       REGISTRATION STATUS
    ================================ */
    isRegistered: {
      type: Boolean,
      default: false,
    },

    /* ===============================
       VIP / SUBSCRIPTION (RAZORPAY)
    ================================ */
    isVip: {
      type: Boolean,
      default: false,
      index: true,
    },

    vipPlan: {
      type: String,
      enum: ["monthly", "annual"],
    },

    vipActivatedAt: {
      type: Date,
    },

    vipExpiresAt: {
      type: Date,
      index: true,
    },
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
