import { z } from "zod";
import Message from "../models/Message.js";
import Match from "../models/Match.js";
import { getIo } from "../socket/io.js";

/* ================= VALIDATION ================= */
export const sendMessageSchema = z.object({
  body: z.object({
    matchId: z.string(),
    text: z.string().min(1).max(1000),
  }),
});

/* ================= SEND MESSAGE ================= */
export const sendMessage = async (req, res, next) => {
  try {
    const { matchId, text } = req.body;

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    const allowed =
      String(match.user1) === String(req.user._id) ||
      String(match.user2) === String(req.user._id);

    if (!allowed) {
      return res.status(403).json({ message: "Not part of this match" });
    }

    const message = await Message.create({
      match: matchId,
      sender: req.user._id,
      text,
      status: "sent",
    });

    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
};

/* ================= GET MESSAGES ================= */
export const getMessages = async (req, res, next) => {
  try {
    const matchId = req.params.matchId;

    // Exclude messages deleted for everyone, and messages deleted for this user
    const messages = await Message.find({
      match: matchId,
      deletedForEveryone: { $ne: true },
      deletedFor: { $ne: req.user._id },
    })
      .sort({ createdAt: 1 })
      .lean();

    res.json(messages);
  } catch (err) {
    next(err);
  }
};

/* ================= DELETE MESSAGE ================= */
export const deleteMessage = async (req, res, next) => {
  try {
    const messageId = req.params.id;
    const scope = (req.query.scope || "me").toLowerCase();

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    // Delete for me
    if (scope === "me") {
      const already = message.deletedFor?.some(
        (id) => String(id) === String(req.user._id)
      );
      if (!already) {
        message.deletedFor = [...(message.deletedFor || []), req.user._id];
        await message.save();
      }

      return res.json({ success: true });
    }

    // Delete for everyone
    if (scope === "everyone") {
      // Only sender may delete for everyone
      if (String(message.sender) !== String(req.user._id)) {
        return res.status(403).json({ message: "Only sender can delete for everyone" });
      }

      // Time limit: 1 hour (3600 seconds)
      const timeLimitMs = 60 * 60 * 1000;
      const age = Date.now() - new Date(message.createdAt).getTime();
      if (age > timeLimitMs) {
        return res.status(403).json({ message: "Time limit exceeded for deleting message for everyone" });
      }

      // Mark deleted for everyone and remove content
      message.deletedForEveryone = true;
      message.text = null;
      message.reactions = {};
      await message.save();

      // Emit real-time deletion to room (if socket io initialized)
      try {
        const io = getIo();
        if (io && message.match) {
          io.to(String(message.match)).emit("messageDeleted", {
            messageId: message._id,
            matchId: message.match,
            deletedForEveryone: true,
            message,
          });
        }
      } catch (err) {
        // don't block response on emit error
      }

      return res.json({ success: true });
    }

    return res.status(400).json({ message: "Invalid scope" });
  } catch (err) {
    next(err);
  }
};

/* ================= MARK READ ================= */
export const markRead = async (req, res, next) => {
  try {
    await Message.updateMany(
      {
        match: req.params.matchId,
        sender: { $ne: req.user._id },
        status: { $ne: "read" },
      },
      { status: "read" }
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
