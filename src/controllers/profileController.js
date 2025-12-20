import { z } from "zod";
import User from "../models/User.js";
import UserProfile from "../models/UserProfile.js";
import TonightPlan from "../models/TonightPlan.js";
import Photo from "../models/Photo.js";
import cloudinary from "../config/cloudinary.js";
import multer from "multer";

/* ===============================
   ZOD SCHEMA
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

    favoriteClubs: z.array(z.string()).optional(),

    drinkingLevel: z.enum(["little", "moderate", "heavy"]),
    splitBill: z.boolean(),
    openForAfterparty: z.boolean(),

    tonightClubId: z.string().optional(),
    tonightArrivalTime: z.string().optional(),
  }),
});

/* ===============================
   CREATE / UPDATE PROFILE
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

    /* ----------------------------
       SAVE PROFILE
    ----------------------------- */
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
        favoriteClubs,
        drinkingLevel,
        splitBill,
        openForAfterparty,
      },
      { upsert: true, new: true }
    );

    console.log("✅ PROFILE SAVED:", profile._id.toString());

    /* ----------------------------
       🔥 MARK USER AS REGISTERED
    ----------------------------- */
    await User.findByIdAndUpdate(req.user._id, {
      isRegistered: true,
    });

    const freshUser = await User.findById(req.user._id);

    console.log(
      "🔥 USER REGISTERED:",
      freshUser._id.toString(),
      "isRegistered:",
      freshUser.isRegistered
    );

    /* ----------------------------
       TONIGHT PLAN (OPTIONAL)
    ----------------------------- */
    if (tonightClubId && tonightArrivalTime) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const plan = await TonightPlan.findOneAndUpdate(
        { user: req.user._id, date: today },
        {
          user: req.user._id,
          club: tonightClubId,
          arrivalTime: tonightArrivalTime,
          date: today,
        },
        { upsert: true, new: true }
      );

      console.log("🌙 TONIGHT PLAN SAVED:", plan._id.toString());
    }

    return res.status(201).json({
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
   GET MY PROFILE  ✅ FIXED
================================ */
// export const getMyProfile = async (req, res) => {
//   try {
//     console.log("📄 FETCH PROFILE FOR USER:", req.user._id.toString());

//     const profile = await UserProfile.findOne({ user: req.user._id })
//       .populate("favoriteClubs");

//     if (!profile) {
//       console.log("⚠️ NO PROFILE FOUND");
//       return res.status(404).json({ message: "Profile not found" });
//     }

//     console.log("✅ PROFILE FOUND:", profile._id.toString());

//     res.json({
//       profile,
//       isRegistered: req.user.isRegistered,
//     });

//   } catch (err) {
//     console.error("❌ GET PROFILE ERROR:", err);
//     res.status(500).json({ message: "Failed to fetch profile" });
//   }
// };


export const getMyProfile = async (req, res) => {
  try {
    console.log("📄 FETCH PROFILE FOR USER:", req.user._id.toString());

    const profile = await UserProfile.findOne({ user: req.user._id })
      .populate("favoriteClubs")
      .lean();

    if (!profile) {
      console.log("⚠️ NO PROFILE FOUND");
      return res.status(404).json({ message: "Profile not found" });
    }

    // 🔥 FETCH USER PHOTOS
    const photos = await Photo.find({ user: req.user._id })
      .sort({ order: 1 })
      .lean();

    console.log("🖼️ Photos found:", photos.length);

    res.json({
      profile: {
        ...profile,
        photos, // ✅ ATTACHED HERE
      },
      isRegistered: req.user.isRegistered,
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
   UPLOAD PHOTOS
================================ */
export const uploadPhotos = async (req, res, next) => {
  try {
    console.log("📸 PHOTO UPLOAD USER:", req.user._id.toString());

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No photos uploaded" });
    }

    const uploads = await Promise.all(
      req.files.map((file, index) => {
        return new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              folder: "club-match/profile",
            },
            async (err, result) => {
              if (err) return reject(err);

              const photo = await Photo.create({
                user: req.user._id,
                url: result.secure_url,
                publicId: result.public_id,
                order: index + 1,
              });

              console.log("✅ PHOTO SAVED:", photo._id.toString());
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
