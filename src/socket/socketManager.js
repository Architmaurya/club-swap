import Match from "../models/Match.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import PrivacySettings from "../models/PrivacySettings.js";
import { log } from "../utils/logger.js";
import { setIo } from "./io.js";


const onlineUsers = new Map();
const offlineTimers = new Map();
const OFFLINE_DELAY = 1000;

export const socketManager = (io) => {
  if (!io) throw new Error("❌ socketManager called without io");

  // Make io available to controllers that need to emit events
  try {
    setIo(io);
  } catch (err) {
    log("⚠️ Failed to set io instance:", err.message || err);
  }

  io.on("connection", (socket) => {
    log(`🔌 New Socket Connection: ${socket.id}`);

    // --- USER ONLINE ---
    socket.on("online", async (userId) => {
      log(`📡 Received 'online' event for User: ${userId}`);
      if (!userId) return;
      
      socket.userId = userId;
      onlineUsers.set(userId, socket.id);
      
      if (offlineTimers.has(userId)) {
        log(`⏳ Clearing offline timer for User: ${userId}`);
        clearTimeout(offlineTimers.get(userId));
        offlineTimers.delete(userId);
      }

      await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });
      const privacy = await PrivacySettings.findOne({ user: userId });
      
      if (privacy?.showOnlineStatus !== false) {
        io.emit("userOnline", userId);
        log(`🟢 Broadcasted 'userOnline' for: ${userId}`);
      }
    });

    // --- USER OFFLINE ---
    socket.on("offline", async (userId) => {
      log(`🚪 Received 'offline' (manual) for User: ${userId}`);
      if (!userId) return;
      
      onlineUsers.delete(userId);
      const lastSeen = new Date();
      
      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen });
      io.emit("userOffline", { userId, lastSeen });
      log(`🔴 Broadcasted 'userOffline' for: ${userId}`);
    });

    // --- JOIN ROOM ---
    socket.on("joinRoom", async ({ matchId, userId }) => {
      log(`🏠 User ${userId} joining Room: ${matchId}`);
      if (!matchId || !userId) return;
      socket.join(matchId);
    });

    // --- STAGE 3: DELIVERED ---
    socket.on("sendMessage", async ({ matchId, messageId }) => {
      log(`✉️ 'sendMessage' triggered. Message: ${messageId} in Match: ${matchId}`);
      if (!matchId || !messageId) return;
      
      const msg = await Message.findByIdAndUpdate(
        messageId, 
        { status: "delivered" }, 
        { new: true }
      );

      if (msg) {
        io.to(matchId).emit("newMessage", msg);
        log(`✅ Message ${messageId} status updated to: DELIVERED`);
      } else {
        log(`❌ Message ${messageId} not found for delivery update`);
      }
    });

    // --- STAGE 4: READ ---
    socket.on("markAsRead", async ({ matchId, userId }) => {
      log(`📖 'markAsRead' triggered by User: ${userId} for Match: ${matchId}`);
      if (!matchId || !userId) return;
      
      const result = await Message.updateMany(
        { match: matchId, sender: { $ne: userId }, status: { $ne: "read" } },
        { $set: { status: "read" } }
      );

      log(`🔵 DB Updated: ${result.modifiedCount} messages set to READ`);

      io.to(matchId).emit("messagesRead", { matchId, readerId: userId });
      log(`🔵 Broadcasted 'messagesRead' to room: ${matchId}`);
    });

    // --- TYPING ---
    socket.on("typing", ({ matchId, userId }) => {
      socket.to(matchId).emit("typing", userId);
    });

    socket.on("stopTyping", ({ matchId, userId }) => {
      socket.to(matchId).emit("stopTyping", userId);
    });

    // --- DISCONNECT ---
    socket.on("disconnect", () => {
      const userId = socket.userId;
      log(`🔌 Socket disconnected: ${socket.id} (User: ${userId || 'Unknown'})`);

      if (!userId) return;

      const timer = setTimeout(async () => {
        onlineUsers.delete(userId);
        const lastSeen = new Date();
        
        await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen });
        io.emit("userOffline", { userId, lastSeen });
        
        offlineTimers.delete(userId);
        log(`⏰ Timer expired: User ${userId} is now marked OFFLINE`);
      }, OFFLINE_DELAY);

      offlineTimers.set(userId, timer);
    });
  });
};