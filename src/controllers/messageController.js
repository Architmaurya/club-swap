import { z } from "zod";
import Message from "../models/Message.js";
import Match from "../models/Match.js";

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
    const messages = await Message.find({
      match: req.params.matchId,
    })
      .sort({ createdAt: 1 })
      .lean();

    res.json(messages);
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
