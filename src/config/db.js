import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;

    if (!mongoURI) {
      console.error("❌ MONGO_URI is missing in .env");
      process.exit(1);
    }

    console.log("⏳ Connecting to MongoDB Atlas...");

    const conn = await mongoose.connect(mongoURI, {
      dbName: process.env.MONGO_DB_NAME || "club_match",
      autoIndex: true,
      maxPoolSize: 20
    });

    console.log(`🌍 MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error("❌ MongoDB Atlas connection error:", err.message);
    process.exit(1);
  }

  // OPTIONAL: Extra event listeners for debugging
  mongoose.connection.on("connected", () => {
    console.log("🟢 Mongoose connected to database");
  });

  mongoose.connection.on("error", (err) => {
    console.error("🔴 Mongoose connection error:", err);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("🟡 Mongoose disconnected");
  });
};
