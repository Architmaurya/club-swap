import crypto from "crypto";
import razorpay from "../config/razorpay.js";

export const createVipOrder = async (req, res) => {
  try {
    log("🔥 Creating VIP order");

    const { plan } = req.body;

    const amount =
      plan === "monthly"
        ? 9900
        : plan === "annual"
        ? 59900
        : null;

    if (!amount) {
      return res.status(400).json({ message: "Invalid plan" });
    }

    // ✅ FIXED RECEIPT (MAX 40 CHARS)
    const receipt = `vip_${crypto.randomBytes(6).toString("hex")}`;

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt,
      notes: {
        userId: String(req.user._id),
        plan,
      },
    });

    return res.status(200).json({
      order,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    log("❌ RAZORPAY ERROR FULL:", err);
    return res.status(500).json({
      message: err?.error?.description || "Failed to create order",
    });
  }
};


/* ===============================
   VERIFY VIP PAYMENT (UX ONLY)
   ❌ DO NOT ACTIVATE VIP
================================ */
export const verifyVipPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Invalid signature" });
    }

    return res.status(200).json({
      message: "Payment verified. Waiting for webhook.",
    });
  } catch (err) {
    log("❌ VERIFY ERROR:", err);
    return res.status(500).json({ message: "Verification failed" });
  }
};
