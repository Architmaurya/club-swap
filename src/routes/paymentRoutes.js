import express from "express";
import { authRequired } from "../middleware/auth.js";
import {
  createVipOrder,
  verifyVipPayment,
} from "../controllers/paymentController.js";

const router = express.Router();

router.post("/vip/order", authRequired, createVipOrder);
router.post("/vip/verify", authRequired, verifyVipPayment);

export default router;
