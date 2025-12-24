import Match from "../models/Match.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import PrivacySettings from "../models/PrivacySettings.js";

const onlineUsers = new Map();
const offlineTimers = new Map();
const OFFLINE_DELAY = 1000;

export const socketManager = (io) => {
  if (!io) throw new Error("❌ socketManager called without io");

  io.on("connection", (socket) => {
    console.log(`🔌 New Socket Connection: ${socket.id}`);

    // --- USER ONLINE ---
    socket.on("online", async (userId) => {
      console.log(`📡 Received 'online' event for User: ${userId}`);
      if (!userId) return;
      
      socket.userId = userId;
      onlineUsers.set(userId, socket.id);
      
      if (offlineTimers.has(userId)) {
        console.log(`⏳ Clearing offline timer for User: ${userId}`);
        clearTimeout(offlineTimers.get(userId));
        offlineTimers.delete(userId);
      }

      await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });
      const privacy = await PrivacySettings.findOne({ user: userId });
      
      if (privacy?.showOnlineStatus !== false) {
        io.emit("userOnline", userId);
        console.log(`🟢 Broadcasted 'userOnline' for: ${userId}`);
      }
    });

    // --- USER OFFLINE ---
    socket.on("offline", async (userId) => {
      console.log(`🚪 Received 'offline' (manual) for User: ${userId}`);
      if (!userId) return;
      
      onlineUsers.delete(userId);
      const lastSeen = new Date();
      
      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen });
      io.emit("userOffline", { userId, lastSeen });
      console.log(`🔴 Broadcasted 'userOffline' for: ${userId}`);
    });

    // --- JOIN ROOM ---
    socket.on("joinRoom", async ({ matchId, userId }) => {
      console.log(`🏠 User ${userId} joining Room: ${matchId}`);
      if (!matchId || !userId) return;
      socket.join(matchId);
    });

    // --- STAGE 3: DELIVERED ---
    socket.on("sendMessage", async ({ matchId, messageId }) => {
      console.log(`✉️ 'sendMessage' triggered. Message: ${messageId} in Match: ${matchId}`);
      if (!matchId || !messageId) return;
      
      const msg = await Message.findByIdAndUpdate(
        messageId, 
        { status: "delivered" }, 
        { new: true }
      );

      if (msg) {
        io.to(matchId).emit("newMessage", msg);
        console.log(`✅ Message ${messageId} status updated to: DELIVERED`);
      } else {
        console.log(`❌ Message ${messageId} not found for delivery update`);
      }
    });

    // --- STAGE 4: READ ---
    socket.on("markAsRead", async ({ matchId, userId }) => {
      console.log(`📖 'markAsRead' triggered by User: ${userId} for Match: ${matchId}`);
      if (!matchId || !userId) return;
      
      const result = await Message.updateMany(
        { match: matchId, sender: { $ne: userId }, status: { $ne: "read" } },
        { $set: { status: "read" } }
      );

      console.log(`🔵 DB Updated: ${result.modifiedCount} messages set to READ`);

      io.to(matchId).emit("messagesRead", { matchId, readerId: userId });
      console.log(`🔵 Broadcasted 'messagesRead' to room: ${matchId}`);
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
      console.log(`🔌 Socket disconnected: ${socket.id} (User: ${userId || 'Unknown'})`);

      if (!userId) return;

      const timer = setTimeout(async () => {
        onlineUsers.delete(userId);
        const lastSeen = new Date();
        
        await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen });
        io.emit("userOffline", { userId, lastSeen });
        
        offlineTimers.delete(userId);
        console.log(`⏰ Timer expired: User ${userId} is now marked OFFLINE`);
      }, OFFLINE_DELAY);

      offlineTimers.set(userId, timer);
    });
  });
};