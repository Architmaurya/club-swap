import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    googleId: {
      type: String,
      index: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
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

    // 🔥 AUTH / REGISTRATION STATUS
    isRegistered: {
      type: Boolean,
      default: false, // ❗ new users are NOT registered
    },

    authProvider: {
      type: String,
      enum: ["google", "email"],
    },
  },
  { timestamps: true }
);

// 🔒 Only ONE admin allowed (UNCHANGED)
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
