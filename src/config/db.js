import mongoose from "mongoose";
import { log } from "../utils/logger.js";


export const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;

    if (!mongoURI) {
      log("❌ MONGO_URI is missing in .env");
      process.exit(1);
    }

    log("⏳ Connecting to MongoDB Atlas...");

    const conn = await mongoose.connect(mongoURI, {
      dbName: process.env.MONGO_DB_NAME || "club_match",
      autoIndex: true,
      maxPoolSize: 20
    });

    log(`🌍 MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    log("❌ MongoDB Atlas connection error:", err.message);
    process.exit(1);
  }

  // OPTIONAL: Extra event listeners for debugging
  mongoose.connection.on("connected", () => {
    log("🟢 Mongoose connected to database");
  });

  mongoose.connection.on("error", (err) => {
    log("🔴 Mongoose connection error:", err);
  });

  mongoose.connection.on("disconnected", () => {
    log("🟡 Mongoose disconnected");
  });
};
