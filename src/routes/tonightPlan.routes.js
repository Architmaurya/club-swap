import express from "express";
import {
  upsertTonightPlan,
  getTonightPlan,
  cancelTonightPlan
} from "../controllers/tonightPlan.controller.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

router.get("/tonight", authRequired, getTonightPlan);
router.post("/tonight", authRequired, upsertTonightPlan);
router.delete("/tonight", authRequired, cancelTonightPlan);


export default router;
