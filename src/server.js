// 🔥 LOAD ENV FIRST
import "dotenv/config";

import app from "./app.js";
import { connectDB } from "./config/db.js";
import http from "http";
import { Server } from "socket.io";
import { socketManager } from "./socket/socketManager.js";
import { createInitialAdmin } from "./utils/createAdmin.js";

const PORT = process.env.PORT;

// 🔥 FAIL FAST
if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  console.error("❌ JWT secrets missing");
  process.exit(1);
}

const start = async () => {
  try {
    await connectDB();
    await createInitialAdmin();

    const server = http.createServer(app);

    // ✅ CREATE io HERE
    const io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    console.log("⚡ Socket.IO initialized");

    // ✅ PASS io HERE (THIS WAS MISSING)
    socketManager(io);

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (err) {
    console.error("❌ Server startup failed:", err);
    process.exit(1);
  }
};

start();
