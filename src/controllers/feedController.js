import mongoose from "mongoose";
import UserProfile from "../models/UserProfile.js";
import Like from "../models/Like.js";
import Match from "../models/Match.js";
import { log } from "../utils/logger.js";


/**
 * GET /api/feed
 * Returns preferred-gender profiles,
 * excluding already liked / matched / self.
 * favoriteClubs => club names
 */
export const getFeed = async (req, res, next) => {
  try {
    log("➡️ Feed Request by user:", req.user._id);

    const userId = req.user._id;

    /* ===========================
       FETCH MY PROFILE
    ============================ */
    const me = await UserProfile.findOne({ user: userId });
    if (!me) {
      return res.status(400).json({ message: "Complete your profile first" });
    }

    if (!me.location?.coordinates?.length) {
      return res.status(400).json({ message: "Location not set in profile" });
    }

    /* ===========================
       GENDER PREFERENCE
    ============================ */
    let allowedGenders = [];
    if (me.interestedIn === "women") allowedGenders = ["female"];
    if (me.interestedIn === "men") allowedGenders = ["male"];
    if (me.interestedIn === "everyone") {
      allowedGenders = ["male", "female", "other"];
    }

    /* ===========================
       LIKED USERS
    ============================ */
    const liked = await Like.find({ fromUser: userId }).distinct("toUser");

    /* ===========================
       MATCHED USERS
    ============================ */
    const myMatches = await Match.find({
      $or: [{ user1: userId }, { user2: userId }],
    }).lean();

    const matchedUsers = myMatches.map((m) =>
      String(m.user1) === String(userId) ? m.user2 : m.user1
    );

    /* ===========================
       EXCLUDED IDS
    ============================ */
    const excludedIds = [
      userId,
      ...liked,
      ...matchedUsers,
    ].map((id) => new mongoose.Types.ObjectId(id));

    /* ===========================
       FEED AGGREGATION (FIXED)
    ============================ */
    const feedProfiles = await UserProfile.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: me.location.coordinates,
          },
          distanceField: "distance",
          spherical: true,
        },
      },

      /* 🔥 STRICT & SAFE FILTER */
      {
        $match: {
          $expr: {
            $and: [
              { $in: [{ $toLower: "$gender" }, allowedGenders] },
              { $not: { $in: ["$user", excludedIds] } },
            ],
          },
        },
      },

      { $sample: { size: 20 } },

      /* -------- PHOTOS -------- */
      {
        $lookup: {
          from: "photos",
          localField: "user",
          foreignField: "user",
          as: "photos",
        },
      },

      /* -------- CLUB LOOKUP -------- */
      {
        $lookup: {
          from: "clubs",
          localField: "favoriteClubs",
          foreignField: "_id",
          as: "favoriteClubsData",
        },
      },

      /* -------- MAP CLUB NAMES -------- */
      {
        $addFields: {
          favoriteClubs: {
            $map: {
              input: "$favoriteClubsData",
              as: "club",
              in: "$$club.name",
            },
          },
        },
      },

      /* -------- CLEAN RESPONSE -------- */
      {
        $project: {
          favoriteClubsData: 0,
          __v: 0,
          updatedAt: 0,
        },
      },
    ]);

    log(`✔ Feed generated: ${feedProfiles.length} profiles`);

    return res.status(200).json({ feed: feedProfiles });

  } catch (err) {
    log("❌ Feed Error:", err);
    next(err);
  }
};
