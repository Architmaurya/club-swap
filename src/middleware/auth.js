import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Session from "../models/Session.js";

const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes

export const authRequired = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    /* ---------------------------
       HEADER CHECK
    ---------------------------- */
    if (!header || !header.startsWith("Bearer ")) {
      console.log("❌ AUTH: Authorization header missing/invalid");
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = header.split(" ")[1];

    /* ---------------------------
       VERIFY JWT
    ---------------------------- */
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expired" });
      }
      return res.status(401).json({ message: "Invalid token" });
    }

    console.log("🔓 AUTH: Token decoded:", decoded);

    /* ---------------------------
       SESSION CHECK (IMPORTANT)
    ---------------------------- */
    const session = await Session.findById(decoded.sessionId);

    if (!session || session.revoked) {
      console.log("❌ AUTH: Session revoked or missing");
      return res.status(401).json({ message: "Session expired" });
    }

    /* ---------------------------
       INACTIVITY AUTO LOGOUT
    ---------------------------- */
    const now = Date.now();
    if (now - session.lastActive.getTime() > INACTIVITY_LIMIT) {
      session.revoked = true;
      await session.save();

      console.log("⏳ AUTH: Session expired due to inactivity");
      return res
        .status(401)
        .json({ message: "Logged out due to inactivity" });
    }

    /* ---------------------------
       USER CHECK
    ---------------------------- */
    const user = await User.findById(decoded.userId);
    if (!user) {
      console.log("❌ AUTH: User not found");
      return res.status(401).json({ message: "User not found" });
    }

    /* ---------------------------
       UPDATE ACTIVITY
    ---------------------------- */
    session.lastActive = new Date();
    await session.save();

    /* ---------------------------
       ATTACH TO REQUEST
    ---------------------------- */
    req.user = user;
    req.session = session;

    console.log("✅ AUTH: User authenticated:", user._id.toString());
    next();

  } catch (err) {
    console.error("❌ AUTH ERROR:", err);
    return res.status(401).json({ message: "Unauthorized" });
  }
};
export const adminOnly = (req, res, next) => {
  if (!req.user) {
    console.log("❌ ADMIN: No user on request");
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "admin") {
    console.log("❌ ADMIN: Access denied:", req.user._id.toString());
    return res.status(403).json({ message: "Admin access only" });
  }

  console.log("✅ ADMIN ACCESS GRANTED:", req.user._id.toString());
  next();
};
