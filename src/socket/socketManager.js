import Match from "../models/Match.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import PrivacySettings from "../models/PrivacySettings.js";

/* ===============================
   IN-MEMORY TRACKING
================================ */
const onlineUsers = new Map(); // userId => socketId
const offlineTimers = new Map();

const OFFLINE_DELAY = 5 * 1000; // 5 seconds

export const socketManager = (io) => {
  if (!io) throw new Error("❌ socketManager called without io");

  io.on("connection", (socket) => {
    console.log("🟢 Socket connected:", socket.id);

    /* ===============================
       USER ONLINE
    ================================ */
    socket.on("online", async (userId) => {
      console.log("🔥 BACKEND RECEIVED ONLINE EVENT:", userId);
      if (!userId) return;

      socket.userId = userId;
      onlineUsers.set(userId, socket.id);

      // ❌ cancel pending offline timers
      if (offlineTimers.has(userId)) {
        clearTimeout(offlineTimers.get(userId));
        offlineTimers.delete(userId);
      }

      await User.findByIdAndUpdate(userId, {
        isOnline: true,
        lastSeen: new Date(),
      });

      const privacy = await PrivacySettings.findOne({ user: userId });
      if (privacy?.showOnlineStatus === false) return;

      io.emit("userOnline", userId);
      console.log("🟢 User online broadcasted:", userId);
    });

    /* ===============================
       🔥 USER OFFLINE (LOGOUT)
    ================================ */
    socket.on("offline", async (userId) => {
      console.log("🚪 BACKEND RECEIVED OFFLINE (LOGOUT):", userId);
      if (!userId) return;

      // 🧹 FULL CLEANUP
      onlineUsers.delete(userId);

      if (offlineTimers.has(userId)) {
        clearTimeout(offlineTimers.get(userId));
        offlineTimers.delete(userId);
      }

      socket.userId = null;

      const lastSeen = new Date();

      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeen,
      });

      const privacy = await PrivacySettings.findOne({ user: userId });
      if (privacy?.showOnlineStatus === false) return;

      io.emit("userOffline", { userId, lastSeen });
      console.log("🔴 User offline broadcasted (logout):", userId);
    });

    /* ===============================
       JOIN ROOM
    ================================ */
    socket.on("joinRoom", async ({ matchId, userId }) => {
      if (!matchId || !userId) return;

      const match = await Match.findById(matchId);
      if (!match) return;

      const allowed =
        String(match.user1) === String(userId) ||
        String(match.user2) === String(userId);

      if (!allowed) return;

      socket.join(matchId);
    });

    /* ===============================
       SEND MESSAGE → DELIVERED TICK
    ================================ */
    socket.on("sendMessage", async ({ matchId, messageId }) => {
      if (!matchId || !messageId) return;

      const msg = await Message.findByIdAndUpdate(
        messageId,
        { status: "delivered" },
        { new: true }
      );

      if (!msg) return;

      io.to(matchId).emit("newMessage", msg);
    });

    /* ===============================
       TYPING INDICATOR
    ================================ */
    socket.on("typing", ({ matchId, userId }) => {
      socket.to(matchId).emit("typing", userId);
    });

    socket.on("stopTyping", ({ matchId, userId }) => {
      socket.to(matchId).emit("stopTyping", userId);
    });

    /* ===============================
       DISCONNECT (FALLBACK)
    ================================ */
    socket.on("disconnect", () => {
      const userId = socket.userId;
      if (!userId) return;

      console.log("🔴 Socket disconnected:", userId);

      const timer = setTimeout(async () => {
        onlineUsers.delete(userId);

        const lastSeen = new Date();
        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen,
        });

        const privacy = await PrivacySettings.findOne({ user: userId });
        if (privacy?.showOnlineStatus === false) return;

        io.emit("userOffline", { userId, lastSeen });
        offlineTimers.delete(userId);

        console.log("🔴 User offline broadcasted (disconnect):", userId);
      }, OFFLINE_DELAY);

      offlineTimers.set(userId, timer);
    });
  });
};
