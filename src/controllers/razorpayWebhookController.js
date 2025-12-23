import crypto from "crypto";
import User from "../models/User.js";

/* ===============================
   TIME HELPERS (IST SAFE)
================================ */
const toIST = (date = new Date()) =>
  new Date(date.getTime() + 5.5 * 60 * 60 * 1000);

const istToUTC = (istDate) =>
  new Date(istDate.getTime() - 5.5 * 60 * 60 * 1000);

/* ===============================
   RAZORPAY WEBHOOK
================================ */
export const razorpayWebhook = async (req, res) => {
  try {
    console.log("🔥 RAZORPAY WEBHOOK HIT");

    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    if (!signature) {
      console.error("❌ Missing signature");
      return res.status(400).json({ message: "Missing signature" });
    }

    const rawBody = req.body;

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    if (expectedSignature !== signature) {
      console.error("❌ Invalid webhook signature");
      return res.status(400).json({ message: "Invalid signature" });
    }

    const event = JSON.parse(rawBody.toString());
    console.log("📩 EVENT:", event.event);

    if (event.event !== "payment.captured") {
      return res.status(200).json({ status: "ignored" });
    }

    const payment = event.payload.payment.entity;
    console.log("📩 NOTES:", payment.notes);

    const userId = payment.notes?.userId;
    const plan = payment.notes?.plan;

    if (!userId || !plan) {
      console.warn("⚠️ Missing userId / plan in notes");
      return res.status(200).json({ status: "no-vip-metadata" });
    }

    const user = await User.findById(userId).select("vipExpiresAt");
    if (!user) {
      console.error("❌ User not found:", userId);
      return res.status(200).json({ status: "user-not-found" });
    }

    /* ===============================
       VIP EXPIRY LOGIC (SAFE)
    ================================ */
    const nowIST = toIST(new Date());

    const baseExpiryIST =
      user.vipExpiresAt && user.vipExpiresAt > new Date()
        ? toIST(user.vipExpiresAt)
        : nowIST;

    const newExpiryIST = new Date(baseExpiryIST);

    if (plan === "monthly") {
      newExpiryIST.setMonth(newExpiryIST.getMonth() + 1);
    } else if (plan === "annual") {
      newExpiryIST.setFullYear(newExpiryIST.getFullYear() + 1);
    }

    const newExpiryUTC = istToUTC(newExpiryIST);

    /* ===============================
       🔥 ATOMIC UPDATE (NO VALIDATION)
    ================================ */
    await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          isVip: true,
          vipPlan: plan,
          vipActivatedAt: new Date(),
          vipExpiresAt: newExpiryUTC,
        },
      },
      { runValidators: false }
    );

    console.log("✅ VIP UPDATED", {
      userId,
      plan,
      expiresAtIST: newExpiryIST.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      }),
      expiresAtUTC: newExpiryUTC,
    });

    return res.status(200).json({ status: "vip-updated" });
  } catch (err) {
    console.error("❌ WEBHOOK ERROR:", err);
    return res.status(500).json({ message: "Webhook error" });
  }
};
