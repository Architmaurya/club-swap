import crypto from "crypto";
import User from "../models/User.js";

/* ===============================
   RAZORPAY WEBHOOK
================================ */
export const razorpayWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    const signature = req.headers["x-razorpay-signature"];

    if (!signature) {
      return res.status(400).json({ message: "Missing signature" });
    }

    // ✅ RAW BODY BUFFER
    const rawBody = req.body;

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    if (expectedSignature !== signature) {
      console.error("❌ INVALID WEBHOOK SIGNATURE");
      return res.status(400).json({ message: "Invalid signature" });
    }

    // ✅ PARSE AFTER VERIFICATION
    const event = JSON.parse(rawBody.toString());

    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;

      const userId = payment.notes?.userId;
      const plan = payment.notes?.plan;

      if (!userId || !plan) {
        return res.status(200).json({ message: "No VIP metadata" });
      }

      const expiry = new Date();
      expiry.setMonth(
        expiry.getMonth() + (plan === "monthly" ? 1 : 12)
      );

      await User.findByIdAndUpdate(userId, {
        isVip: true,
        vipPlan: plan,
        vipActivatedAt: new Date(),
        vipExpiresAt: expiry,
      });

      console.log("✅ VIP ACTIVATED VIA WEBHOOK:", userId);
    }

    res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error("❌ WEBHOOK ERROR:", err);
    res.status(500).json({ message: "Webhook error" });
  }
};
