import express from "express";
import {
  createOrUpdateProfile,
  createProfileSchema,
  uploadPhotos,
  upload,
  getMyProfile,
  reorderPhotos,
  deletePhoto,
} from "../controllers/profileController.js";

import { authRequired } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = express.Router();

/* ===============================
   CREATE / UPDATE PROFILE
================================ */
router.post(
  "/",
  authRequired,
  validate(createProfileSchema),
  createOrUpdateProfile
);

/* ===============================
   UPLOAD PROFILE PHOTOS
================================ */
router.post(
  "/photos",
  authRequired,
  upload.array("photos", 6),
  uploadPhotos
);

/* ===============================
   REORDER / MAKE MAIN PHOTO
================================ */
router.put(
  "/photos/reorder",
  authRequired,
  reorderPhotos
);

/* ===============================
   DELETE PHOTO
================================ */
router.delete(
  "/photos/:photoId",
  authRequired,
  deletePhoto
);

/* ===============================
   GET MY PROFILE
================================ */
router.get(
  "/me",
  authRequired,
  getMyProfile
);

export default router;
