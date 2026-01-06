import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Session from "../models/Session.js";
import { log } from "../utils/logger.js";

/* ======================================================
   AUTH MIDDLEWARE
====================================================== */

export const authRequired = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = header.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expired" });
      }
      return res.status(401).json({ message: "Invalid token" });
    }

    /* ===============================
       SESSION CHECK
    ================================ */
    const session = await Session.findById(decoded.sessionId);

    if (!session || session.revoked) {
      return res.status(401).json({ message: "Session expired" });
    }

    /* ===============================
       USER FETCH
    ================================ */
    const user = await User.findById(decoded.userId).select(
      "_id email role isVip vipExpiresAt vipPlan isRegistered"
    );

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    /* ===============================
       VIP ACTIVE (RACE SAFE)
    ================================ */
    const NOW = Date.now();
    const EXPIRY = user.vipExpiresAt
      ? new Date(user.vipExpiresAt).getTime()
      : 0;

    const isVipActive =
      user.isVip &&
      EXPIRY - NOW > 2000;

    /* ===============================
       UPDATE SESSION ACTIVITY
    ================================ */
    session.lastActive = new Date();
    await session.save();

    /* ===============================
       ATTACH SAFE USER OBJECT
    ================================ */
    req.user = {
      userId: user._id,
      email: user.email,
      role: user.role,
      isRegistered: user.isRegistered,
      isVip: user.isVip,
      vipPlan: user.vipPlan,
      vipExpiresAt: user.vipExpiresAt,
      isVipActive,
      sessionId: session._id,
    };

    req.session = session;

    next();
  } catch (err) {
    log("❌ AUTH ERROR:", err);
    res.status(401).json({ message: "Unauthorized" });
  }
};

/* ===============================
   ADMIN GUARD
================================ */
export const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access only" });
  }

  next();
};
