import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import mongoSanitize from "express-mongo-sanitize";
import xss from "xss-clean";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import clubRoutes from "./routes/clubRoutes.js";
import matchRoutes from "./routes/matchRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import privacyRoutes from "./routes/privacyRoutes.js";
import feedRoutes from "./routes/feedRoutes.js";
import tonightPlanRoutes from "./routes/tonightPlan.routes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";

import { notFound, errorHandler } from "./middleware/errorHandler.js";

const app = express();

console.log("⚙️ Initializing Express App...");

app.set("trust proxy", 1);

// -------------------------
// 🔴 RAZORPAY WEBHOOK (RAW BODY FIRST)
// -------------------------
app.use(
  "/api/webhook/razorpay",
  express.raw({ type: "application/json" }),
  webhookRoutes
);

// -------------------------
// Rate Limiting
// -------------------------
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

app.use(limiter);

// -------------------------
// Security Middlewares
// -------------------------
app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN
      ? process.env.CLIENT_ORIGIN.split(",")
      : "*",
    credentials: true,
  })
);

// -------------------------
// NORMAL JSON PARSER (AFTER WEBHOOK)
// -------------------------
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize());
app.use(xss());
app.use(compression());
app.use(morgan("dev"));

console.log("🔒 Security & Parser middlewares loaded");

// -------------------------
// Root Route
// -------------------------
app.get("/", (req, res) => {
  res.json({ message: "Club Match API running" });
});

// -------------------------
// API Routes
// -------------------------
console.log("📌 Loading API routes...");

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/clubs", clubRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/privacy", privacyRoutes);
app.use("/api/feed", feedRoutes);
app.use("/api/plan", tonightPlanRoutes);
app.use("/api/payment", paymentRoutes);

console.log("✔ All API routes loaded");

// -------------------------
// Error Handlers
// -------------------------
app.use(notFound);
app.use(errorHandler);

console.log("🛑 Error handling middlewares active");

export default app;
