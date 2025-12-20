import express from "express";
import { authRequired } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  updatePrivacy,
  privacySchema
} from "../controllers/privacyController.js";

const router = express.Router();

router.put("/", authRequired, validate(privacySchema), updatePrivacy);

export default router;
