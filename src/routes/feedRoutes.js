import express from "express";
import { authRequired } from "../middleware/auth.js";
import { getFeed } from "../controllers/feedController.js";

const router = express.Router();

router.get("/", authRequired, getFeed);

export default router;
