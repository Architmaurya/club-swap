import Razorpay from "razorpay";
import { log } from "../utils/logger.js";


const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ✅ Safe debug (PUBLIC KEY ONLY)
log(
  "✅ Razorpay initialized with key:",
  process.env.RAZORPAY_KEY_ID
);

export default razorpay;
