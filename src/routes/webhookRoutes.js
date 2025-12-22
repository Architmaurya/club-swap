import express from "express";
import { razorpayWebhook } from "../controllers/razorpayWebhookController.js";

const router = express.Router();

router.post("/", razorpayWebhook);

export default router;
