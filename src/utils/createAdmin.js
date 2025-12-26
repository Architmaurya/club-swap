import User from "../models/User.js";
import { log } from "./logger.js";


export const createInitialAdmin = async () => {
  const adminExists = await User.findOne({ role: "admin" });
  if (adminExists) {
    log("🔒 Admin already exists.");
    return;
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminGoogleId = process.env.ADMIN_GOOGLE_ID;

  if (!adminEmail || !adminGoogleId) {
    log("❌ Missing admin credentials in .env");
    return;
  }

  await User.create({
    email: adminEmail,
    googleId: adminGoogleId,
    role: "admin"
  });

  log(`👑 Admin created: ${adminEmail}`);
};
