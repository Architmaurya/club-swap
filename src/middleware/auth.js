import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Session from "../models/Session.js";
import { log } from "../utils/logger.js";
 

const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes

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

    if (Date.now() - session.lastActive.getTime() > INACTIVITY_LIMIT) {
      session.revoked = true;
      await session.save();
      return res.status(401).json({
        message: "Logged out due to inactivity",
      });
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
       VIP ACTIVE (FIXED – RACE SAFE)
    ================================ */
    const NOW = Date.now();
    const EXPIRY = user.vipExpiresAt
      ? new Date(user.vipExpiresAt).getTime()
      : 0;

    // ⏱️ 2-second safety buffer to avoid millisecond boundary race
    const isVipActive =
      user.isVip &&
      EXPIRY - NOW > 2000;

    /* ===============================
       UPDATE SESSION
    ================================ */
    session.lastActive = new Date();
    await session.save();

    /* ===============================
       ATTACH SAFE USER OBJECT
    ================================ */
    req.user = {
      _id: user._id,
      email: user.email,
      role: user.role,
      isRegistered: user.isRegistered,
      isVip: user.isVip,
      vipPlan: user.vipPlan,
      vipExpiresAt: user.vipExpiresAt,
      isVipActive, // ✅ STABLE & CORRECT
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
