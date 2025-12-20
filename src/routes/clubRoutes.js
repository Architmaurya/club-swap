import express from "express";
import {
  createClub,
  createClubSchema,
  listClubs
} from "../controllers/clubController.js";
import { authRequired, adminOnly } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = express.Router();

router.post("/", authRequired, adminOnly, validate(createClubSchema), createClub);

router.get("/", authRequired, listClubs);

export default router;
