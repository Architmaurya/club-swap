import jwt from "jsonwebtoken";
import fetch from "node-fetch";
import User from "../models/User.js";
import Session from "../models/Session.js";
import { log } from "../utils/logger.js";

/* ======================================================
   HELPERS
====================================================== */
const normalizeEmail = (email) => email.trim().toLowerCase();

/* 🔐 ACCESS TOKEN */
const signToken = (userId, sessionId) => {
  log("🔐 Signing access token");
  return jwt.sign(
    { userId, sessionId },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
};

/* 🔁 REFRESH TOKEN */
const signRefreshToken = (userId, sessionId) => {
  log("🔁 Signing refresh token");
  return jwt.sign(
    { userId, sessionId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "30d" }
  );
};

/* ======================================================
   CREATE / REPLACE SESSION
====================================================== */
const createSession = async (userId, deviceId) => {
  log("🧩 Creating session");
  log("   userId:", userId);
  log("   deviceId:", deviceId);

  // remove old session for same device
  await Session.deleteMany({ user: userId, deviceId });

  return Session.create({
    user: userId,
    deviceId,
    refreshToken: "temp",
    revoked: false,
    lastActive: new Date(),
  });
};

/* ======================================================
   GOOGLE LOGIN
====================================================== */
export const googleLogin = async (req, res) => {
  try {
    log("=================================");
    log("🟢 GOOGLE LOGIN API HIT");

    const { idToken, deviceId } = req.body;

    if (!idToken || !deviceId) {
      log("❌ Missing idToken or deviceId");
      return res.status(400).json({
        message: "ID token & deviceId required",
      });
    }

    log("🟡 Verifying Google token");

    const fetchFn = global.fetch || fetch;
    const googleRes = await fetchFn(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
    );

    const payload = await googleRes.json();
    log("🟢 GOOGLE PAYLOAD:", payload);

    if (payload.error_description) {
      log("❌ Invalid Google token");
      return res.status(401).json({ message: "Invalid Google token" });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (payload.aud !== clientId && payload.azp !== clientId) {
      log("❌ Audience mismatch");
      return res.status(401).json({ message: "Invalid Google audience" });
    }

    if (!payload.email) {
      log("❌ Google account has no email");
      return res.status(400).json({ message: "Google email not available" });
    }

    const email = normalizeEmail(payload.email);
    log("📧 Google email:", email);

    let user = await User.findOne({ email });

    if (!user) {
      log("🆕 Creating Google user");
      user = await User.create({
        email,
        googleId: payload.sub,
        name: payload.name,
        avatar: payload.picture,
        authProvider: "google",
        isRegistered: false,
      });
    } else {
      log("👤 Existing user:", user._id);
    }

    const session = await createSession(user._id, deviceId);

    const accessToken = signToken(user._id, session._id);
    const refreshToken = signRefreshToken(user._id, session._id);

    session.refreshToken = refreshToken;
    session.lastActive = new Date();
    await session.save();

    log("✅ GOOGLE LOGIN SUCCESS:", email);
    log("=================================");

    res.json({
      token: accessToken,
      refreshToken,
      isRegistered: user.isRegistered,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
      },
    });
  } catch (err) {
    log("❌ GOOGLE LOGIN ERROR:", err);
    res.status(500).json({ message: "Google login failed" });
  }
};

/* ======================================================
   REFRESH TOKEN
====================================================== */
export const refreshToken = async (req, res) => {
  try {
    log("🔁 Refresh token request");

    const { refreshToken: incomingRefreshToken } = req.body;

    if (!incomingRefreshToken) {
      log("❌ Refresh token missing");
      return res.status(401).json({ message: "Refresh token required" });
    }

    const decoded = jwt.verify(
      incomingRefreshToken,
      process.env.JWT_REFRESH_SECRET
    );

    const session = await Session.findById(decoded.sessionId);

    if (
      !session ||
      session.revoked ||
      session.refreshToken !== incomingRefreshToken
    ) {
      log("❌ Refresh token invalid or session revoked");
      return res.status(401).json({ message: "Session expired" });
    }

    // rotate refresh token (important)
    const newAccessToken = signToken(decoded.userId, session._id);
    const newRefreshToken = signRefreshToken(decoded.userId, session._id);

    session.refreshToken = newRefreshToken;
    session.lastActive = new Date();
    await session.save();

    log("✅ Token refreshed successfully");

    res.json({
      token: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    log("❌ REFRESH TOKEN ERROR:", err.message);
    res.status(401).json({ message: "Invalid refresh token" });
  }
};

/* ======================================================
   LOGOUT (CURRENT DEVICE)
====================================================== */
export const logout = async (req, res) => {
  try {
    log("👋 Logout current device");

    const sessionId = req.user?.sessionId;

    if (!sessionId) {
      log("⚠ No sessionId found in token");
      return res.json({ message: "Already logged out" });
    }

    await Session.findByIdAndUpdate(sessionId, {
      revoked: true,
    });

    res.json({ message: "Logged out successfully" });
  } catch (err) {
    log("❌ LOGOUT ERROR:", err);
    res.status(500).json({ message: "Logout failed" });
  }
};

/* ======================================================
   LOGOUT ALL DEVICES
====================================================== */
export const logoutAll = async (req, res) => {
  log("👋 Logout all devices for:", req.user.userId);

  await Session.updateMany(
    { user: req.user.userId },
    { revoked: true }
  );

  res.json({ message: "Logged out from all devices" });
};
