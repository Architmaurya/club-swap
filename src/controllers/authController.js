import jwt from "jsonwebtoken";
import fetch from "node-fetch";
import User from "../models/User.js";
import Session from "../models/Session.js";

/* ======================================================
   HELPERS
====================================================== */
const normalizeEmail = (email) => email.trim().toLowerCase();

/* 🔐 ACCESS TOKEN */
const signToken = (userId, sessionId) => {
  console.log("🔐 Signing access token");
  return jwt.sign(
    { userId, sessionId },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );
};

/* 🔁 REFRESH TOKEN */
const signRefreshToken = (userId, sessionId) => {
  console.log("🔁 Signing refresh token");
  return jwt.sign(
    { userId, sessionId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );
};

/* ======================================================
   CREATE / REPLACE SESSION
====================================================== */
const createSession = async (userId, deviceId) => {
  console.log("🧩 Creating session");
  console.log("   userId:", userId);
  console.log("   deviceId:", deviceId);

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
   GOOGLE LOGIN (ONLY AUTH METHOD)
====================================================== */
export const googleLogin = async (req, res) => {
  try {
    console.log("=================================");
    console.log("🟢 GOOGLE LOGIN API HIT");

    const { idToken, deviceId } = req.body;

    if (!idToken || !deviceId) {
      console.log("❌ Missing idToken or deviceId");
      return res.status(400).json({
        message: "ID token & deviceId required",
      });
    }

    console.log("🟡 Verifying Google token");

    const fetchFn = global.fetch || fetch;

    const googleRes = await fetchFn(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
    );

    const payload = await googleRes.json();
    console.log("🟢 GOOGLE PAYLOAD:", payload);

    if (payload.error_description) {
      console.log("❌ Invalid Google token");
      return res.status(401).json({ message: "Invalid Google token" });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;

    console.log("🔍 Audience check");
    console.log("   aud:", payload.aud);
    console.log("   azp:", payload.azp);
    console.log("   expected:", clientId);

    // ✅ Accept aud OR azp
    if (payload.aud !== clientId && payload.azp !== clientId) {
      console.log("❌ Audience mismatch");
      return res.status(401).json({ message: "Invalid Google audience" });
    }

    if (!payload.email) {
      console.log("❌ Google account has no email");
      return res.status(400).json({ message: "Google email not available" });
    }

    const email = normalizeEmail(payload.email);
    console.log("📧 Google email:", email);

    let user = await User.findOne({ email });

    if (!user) {
      console.log("🆕 Creating Google user");
      user = await User.create({
        email,
        googleId: payload.sub,
        name: payload.name,
        avatar: payload.picture,
        authProvider: "google",
        isRegistered: false,
      });
    } else {
      console.log("👤 Existing user:", user._id);
    }

    const session = await createSession(user._id, deviceId);

    const token = signToken(user._id, session._id);
    const refreshToken = signRefreshToken(user._id, session._id);

    session.refreshToken = refreshToken;
    await session.save();

    console.log("✅ GOOGLE LOGIN SUCCESS:", email);
    console.log("=================================");

    res.json({
      token,
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
    console.error("❌ GOOGLE LOGIN ERROR:", err);
    res.status(500).json({ message: "Google login failed" });
  }
};

/* ======================================================
   REFRESH TOKEN
====================================================== */
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    console.log("🔁 Refresh token request");

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET
    );

    const session = await Session.findById(decoded.sessionId);

    if (!session || session.revoked || session.refreshToken !== refreshToken) {
      console.log("❌ Refresh token invalid");
      return res.status(401).json({ message: "Session expired" });
    }

    const token = signToken(decoded.userId, session._id);
    console.log("✅ Token refreshed");

    res.json({ token });
  } catch (err) {
    console.error("❌ REFRESH TOKEN ERROR:", err.message);
    res.status(401).json({ message: "Invalid refresh token" });
  }
};

/* ======================================================
   LOGOUT (CURRENT DEVICE)
====================================================== */
export const logout = async (req, res) => {
  console.log("👋 Logout current device");

  req.session.revoked = true;
  await req.session.save();

  res.json({ message: "Logged out successfully" });
};

/* ======================================================
   LOGOUT ALL DEVICES
====================================================== */
export const logoutAll = async (req, res) => {
  console.log("👋 Logout all devices for:", req.user._id);

  await Session.updateMany(
    { user: req.user._id },
    { revoked: true }
  );

  res.json({ message: "Logged out from all devices" });
};
