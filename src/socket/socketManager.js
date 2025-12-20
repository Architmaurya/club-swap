import Match from "../models/Match.js";
import Message from "../models/Message.js";

export const socketManager = (io) => {
  if (!io) throw new Error("❌ socketManager called without io");

  io.on("connection", (socket) => {
    console.log("🟢 Socket connected:", socket.id);

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

    socket.on("disconnect", () => {
      console.log("🔴 Socket disconnected");
    });
  });
};
