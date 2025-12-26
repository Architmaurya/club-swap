import mongoose from "mongoose";
import { z } from "zod";

import User from "../models/User.js";
import UserProfile from "../models/UserProfile.js";
import TonightPlan from "../models/TonightPlan.js";
import Photo from "../models/Photo.js";
import Club from "../models/Club.js";

import cloudinary from "../config/cloudinary.js";
import multer from "multer";
import { log } from "../utils/logger.js";


/* ===============================
   ZOD SCHEMA (SAFE + FLEXIBLE)
================================ */
export const createProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    age: z.number().min(18),
    gender: z.enum(["male", "female", "other"]),
    interestedIn: z.enum(["men", "women", "everyone"]),
    about: z.string().optional(),

    city: z.string().min(2),
    latitude: z.number(),
    longitude: z.number(),

    // ✅ Accept club IDs OR names
    favoriteClubs: z.array(z.string()).optional(),

    // ✅ Optional (frontend may send null)
    drinkingLevel: z.enum(["little", "moderate", "heavy"]).optional(),
    splitBill: z.boolean().optional(),
    openForAfterparty: z.boolean().optional(),

    tonightClubId: z.string().optional(),
    tonightArrivalTime: z.string().optional(),
  }),
});

/* ===============================
   CREATE / UPDATE PROFILE
================================ */
export const createOrUpdateProfile = async (req, res, next) => {
  try {
    log("======================================");
    log("👤 PROFILE USER:", req.user._id.toString());
    log("📥 RAW PROFILE BODY:", req.body);

    const {
      name,
      age,
      gender,
      interestedIn,
      about,
      city,
      latitude,
      longitude,
      favoriteClubs = [],
      drinkingLevel,
      splitBill,
      openForAfterparty,
      tonightClubId,
      tonightArrivalTime,
    } = req.body;

    /* --------------------------------
       FAVORITE CLUBS (ID OR NAME)
    -------------------------------- */
    let favoriteClubIds = [];

    if (Array.isArray(favoriteClubs) && favoriteClubs.length > 0) {
      log("🎯 favoriteClubs input:", favoriteClubs);

      if (mongoose.isValidObjectId(favoriteClubs[0])) {
        log("🆔 favoriteClubs detected as IDs");
        favoriteClubIds = favoriteClubs;
      } else {
        log("🏷️ favoriteClubs detected as names");

        const clubs = await Club.find({
          name: { $in: favoriteClubs },
        }).select("_id");

        favoriteClubIds = clubs.map((c) => c._id);
      }
    }

    log("✅ favoriteClubIds resolved:", favoriteClubIds);

    /* --------------------------------
       PROFILE PAYLOAD
    -------------------------------- */
    const profilePayload = {
      user: req.user._id,
      name,
      age,
      gender,
      interestedIn,
      about,
      city,
      location: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
      favoriteClubs: favoriteClubIds,
      drinkingLevel: drinkingLevel ?? "little",
      splitBill: splitBill ?? false,
      openForAfterparty: openForAfterparty ?? false,
    };

    log("🧾 FINAL PROFILE PAYLOAD:", profilePayload);

    const profile = await UserProfile.findOneAndUpdate(
      { user: req.user._id },
      profilePayload,
      { upsert: true, new: true }
    );

    log("💾 PROFILE SAVED:", profile._id);

    /* --------------------------------
       MARK USER REGISTERED
    -------------------------------- */
    await User.findByIdAndUpdate(req.user._id, {
      isRegistered: true,
    });

    log("✅ User marked as registered");

    /* --------------------------------
       TONIGHT PLAN (OPTIONAL)
    -------------------------------- */
    if (tonightClubId && tonightArrivalTime) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      log("🌙 Saving TonightPlan");

      await TonightPlan.findOneAndUpdate(
        { user: req.user._id, date: today },
        {
          user: req.user._id,
          club: tonightClubId,
          arrivalTime: tonightArrivalTime,
          date: today,
        },
        { upsert: true, new: true }
      );
    }

    log("======================================");

    res.status(201).json({
      message: "Profile completed successfully",
      isRegistered: true,
      profile,
    });
  } catch (err) {
    log("❌ PROFILE ERROR:", err);
    next(err);
  }
};

/* ===============================
   GET MY PROFILE
================================ */
export const getMyProfile = async (req, res) => {
  try {
    log("📤 Fetching profile for:", req.user._id);

    const profile = await UserProfile.findOne({ user: req.user._id })
      .populate({
        path: "favoriteClubs",
        select: "name category description",
      })
      .lean();

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const photos = await Photo.find({ user: req.user._id })
      .sort({ order: 1 })
      .select("_id url order")
      .lean();

    res.json({
      isRegistered: req.user.isRegistered,
      profile: {
        ...profile,
        favoriteClubs: profile.favoriteClubs || [],
        photos,
      },
    });
  } catch (err) {
    log("❌ GET PROFILE ERROR:", err);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};

/* ===============================
   PHOTO UPLOAD SETUP
================================ */
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    files: 6,
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files allowed"));
    }
    cb(null, true);
  },
});

/* ===============================
   UPLOAD PHOTOS
================================ */
export const uploadPhotos = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No photos uploaded" });
    }

    const lastPhoto = await Photo.findOne({ user: req.user._id }).sort({
      order: -1,
    });

    const startOrder = lastPhoto ? lastPhoto.order + 1 : 1;

    const uploads = await Promise.all(
      req.files.map((file, index) => {
        return new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { folder: "club-match/profile" },
            async (err, result) => {
              if (err) return reject(err);

              const photo = await Photo.create({
                user: req.user._id,
                url: result.secure_url,
                publicId: result.public_id,
                order: startOrder + index,
              });

              resolve(photo);
            }
          ).end(file.buffer);
        });
      })
    );

    res.status(201).json({
      message: "Photos uploaded successfully",
      photos: uploads,
    });
  } catch (err) {
    log("❌ PHOTO UPLOAD ERROR:", err);
    next(err);
  }
};

/* ===============================
   REORDER PHOTOS
================================ */
export const reorderPhotos = async (req, res) => {
  try {
    const { photos } = req.body;

    if (!Array.isArray(photos)) {
      return res.status(400).json({ message: "Invalid photo order data" });
    }

    await Promise.all(
      photos.map((p) =>
        Photo.updateOne(
          { _id: p._id, user: req.user._id },
          { $set: { order: p.order } }
        )
      )
    );

    res.json({ message: "Photo order updated successfully" });
  } catch (err) {
    log("❌ REORDER PHOTOS ERROR:", err);
    res.status(500).json({ message: "Failed to reorder photos" });
  }
};

/* ===============================
   DELETE PHOTO
================================ */
export const deletePhoto = async (req, res) => {
  try {
    const { photoId } = req.params;

    const photo = await Photo.findOne({
      _id: photoId,
      user: req.user._id,
    });

    if (!photo) {
      return res.status(404).json({ message: "Photo not found" });
    }

    await cloudinary.uploader.destroy(photo.publicId);
    await Photo.deleteOne({ _id: photoId });

    const remaining = await Photo.find({ user: req.user._id }).sort({
      order: 1,
    });

    for (let i = 0; i < remaining.length; i++) {
      remaining[i].order = i + 1;
      await remaining[i].save();
    }

    res.json({ message: "Photo deleted successfully" });
  } catch (err) {
    log("❌ DELETE PHOTO ERROR:", err);
    res.status(500).json({ message: "Failed to delete photo" });
  }
};
