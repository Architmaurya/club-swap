import Match from "../models/Match.js";
import Message from "../models/Message.js";

/* 🔥 NEW IMPORTS (ADD ONLY) */
import User from "../models/User.js";
import PrivacySettings from "../models/PrivacySettings.js";

/* 🔥 IN-MEMORY TRACKING (ADD ONLY) */
const onlineUsers = new Map();

export const socketManager = (io) => {
  if (!io) throw new Error("❌ socketManager called without io");

  io.on("connection", (socket) => {
    console.log("🟢 Socket connected:", socket.id);

    /* =================================================
       🔥 ADD: USER ONLINE
    ================================================= */
    socket.on("online", async (userId) => {
      if (!userId) return;

      onlineUsers.set(userId, socket.id);

      const privacy = await PrivacySettings.findOne({ user: userId });

      // Respect privacy
      if (privacy?.showOnlineStatus === false) {
        console.log("🔒 Online status hidden by privacy");
        return;
      }

      await User.findByIdAndUpdate(userId, {
        isOnline: true,
      });

      io.emit("userOnline", userId);
    });

    /* =================================================
       🔥 EXISTING CODE (UNCHANGED)
    ================================================= */
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

    socket.on("sendMessage", async ({ matchId, messageId, senderId }) => {
      if (!matchId || !messageId || !senderId) return;

      const msg = await Message.findByIdAndUpdate(
        messageId,
        { status: "delivered" },
        { new: true }
      );

      if (!msg) return;

      io.to(matchId).emit("newMessage", msg);
    });

    socket.on("typing", ({ matchId, userId }) => {
      socket.to(matchId).emit("typing", userId);
    });

    /* =================================================
       🔥 ADD: USER OFFLINE + LAST SEEN
    ================================================= */
    socket.on("disconnect", async () => {
      console.log("🔴 Socket disconnected");

      let disconnectedUserId = null;

      for (const [uid, sid] of onlineUsers.entries()) {
        if (sid === socket.id) {
          disconnectedUserId = uid;
          onlineUsers.delete(uid);
          break;
        }
      }

      if (!disconnectedUserId) return;

      const privacy = await PrivacySettings.findOne({
        user: disconnectedUserId,
      });

      const lastSeen = new Date();

      await User.findByIdAndUpdate(disconnectedUserId, {
        isOnline: false,
        lastSeen,
      });

      // Respect privacy
      if (privacy?.showOnlineStatus === false) {
        console.log("🔒 Last seen hidden by privacy");
        return;
      }

      io.emit("userOffline", {
        userId: disconnectedUserId,
        lastSeen,
      });
    });
  });
};
