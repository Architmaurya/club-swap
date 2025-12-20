import express from "express";
import {
  createOrUpdateProfile,
  createProfileSchema,
  uploadPhotos,
  upload,
  getMyProfile
} from "../controllers/profileController.js";
import { authRequired } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = express.Router();

router.post("/", authRequired, validate(createProfileSchema), createOrUpdateProfile);

router.post(
  "/photos",
  authRequired,
  upload.array("photos", 6),
  uploadPhotos
);

router.get("/me", authRequired, getMyProfile);

export default router;
