import express from "express";
import { authRequired } from "../middleware/auth.js";
import {
  likeUser,
  unlikeUser,
  listMyMatches,
  getMyLikes,
} from "../controllers/matchController.js";

const router = express.Router();

router.post("/like", authRequired, likeUser);
router.post("/unlike", authRequired, unlikeUser);
router.get("/", authRequired, listMyMatches);
router.get("/like/get", authRequired, getMyLikes);

export default router;
