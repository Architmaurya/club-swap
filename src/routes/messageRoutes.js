import express from "express";
import { authRequired } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  sendMessage,
  sendMessageSchema,
  getMessages,
  markRead,
} from "../controllers/messageController.js";

const router = express.Router();

router.post("/", authRequired, validate(sendMessageSchema), sendMessage);
router.get("/:matchId", authRequired, getMessages);
router.post("/read/:matchId", authRequired, markRead); // ✅ FIX

export default router;
