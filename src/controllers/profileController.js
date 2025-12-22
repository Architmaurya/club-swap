import { z } from "zod";
import User from "../models/User.js";
import UserProfile from "../models/UserProfile.js";
import TonightPlan from "../models/TonightPlan.js";
import Photo from "../models/Photo.js";
import cloudinary from "../config/cloudinary.js";
import multer from "multer";
import Club from "../models/Club.js";

/* ===============================
   ZOD SCHEMA (names allowed)
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

    // 👇 frontend sends club NAMES
    favoriteClubs: z.array(z.string()).optional(),

    drinkingLevel: z.enum(["little", "moderate", "heavy"]),
    splitBill: z.boolean(),
    openForAfterparty: z.boolean(),

    tonightClubId: z.string().optional(),
    tonightArrivalTime: z.string().optional(),
  }),
});

/* ===============================
   CREATE / UPDATE PROFILE (FIXED)
================================ */
export const createOrUpdateProfile = async (req, res, next) => {
  try {
    console.log("👤 PROFILE USER:", req.user._id.toString());
    console.log("📥 PROFILE BODY:", req.body);

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
       🔥 CONVERT CLUB NAMES → IDS
    -------------------------------- */
    let favoriteClubIds = [];

    if (Array.isArray(favoriteClubs) && favoriteClubs.length > 0) {
      const clubs = await Club.find({
        name: { $in: favoriteClubs },
      }).select("_id");

      favoriteClubIds = clubs.map((c) => c._id);
    }

    /* --------------------------------
       SAVE PROFILE
    -------------------------------- */
    const profile = await UserProfile.findOneAndUpdate(
      { user: req.user._id },
      {
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
        favoriteClubs: favoriteClubIds, // ✅ FIXED
        drinkingLevel,
        splitBill,
        openForAfterparty,
      },
      { upsert: true, new: true }
    );

    /* --------------------------------
       MARK USER REGISTERED
    -------------------------------- */
    await User.findByIdAndUpdate(req.user._id, {
      isRegistered: true,
    });

    /* --------------------------------
       TONIGHT PLAN (OPTIONAL)
    -------------------------------- */
    if (tonightClubId && tonightArrivalTime) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

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

    res.status(201).json({
      message: "Profile completed successfully",
      isRegistered: true,
      profile,
    });
  } catch (err) {
    console.error("❌ PROFILE ERROR:", err);
    next(err);
  }
};

/* ===============================
   GET MY PROFILE
================================ */
export const getMyProfile = async (req, res) => {
  try {
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
    console.error("❌ GET PROFILE ERROR:", err);
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
   UPLOAD PHOTOS (APPEND SAFE)
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
    console.error("❌ PHOTO UPLOAD ERROR:", err);
    next(err);
  }
};

/* ===============================
   REORDER / MAKE MAIN PHOTO
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
    console.error("❌ REORDER PHOTOS ERROR:", err);
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
    console.error("❌ DELETE PHOTO ERROR:", err);
    res.status(500).json({ message: "Failed to delete photo" });
  }
};
