import User from "../models/User.js";

export const createInitialAdmin = async () => {
  const adminExists = await User.findOne({ role: "admin" });
  if (adminExists) {
    console.log("🔒 Admin already exists.");
    return;
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminGoogleId = process.env.ADMIN_GOOGLE_ID;

  if (!adminEmail || !adminGoogleId) {
    console.log("❌ Missing admin credentials in .env");
    return;
  }

  await User.create({
    email: adminEmail,
    googleId: adminGoogleId,
    role: "admin"
  });

  console.log(`👑 Admin created: ${adminEmail}`);
};
