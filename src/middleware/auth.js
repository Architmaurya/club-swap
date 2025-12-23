import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Session from "../models/Session.js";

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

    const user = await User.findById(decoded.userId).select(
      "_id email role isVip vipExpiresAt vipPlan isRegistered"
    );

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // 🔥 VIP DERIVED FLAG (SAFE)
    user.isVipActive =
      user.isVip &&
      user.vipExpiresAt &&
      new Date(user.vipExpiresAt) > new Date();

    session.lastActive = new Date();
    await session.save();

    req.user = user;
    req.session = session;

    next();
  } catch (err) {
    console.error("❌ AUTH ERROR:", err);
    res.status(401).json({ message: "Unauthorized" });
  }
};

export const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access only" });
  }

  next();
};
