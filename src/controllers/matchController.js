import Like from "../models/Like.js";
import Match from "../models/Match.js";
import UserProfile from "../models/UserProfile.js";
import PrivacySettings from "../models/PrivacySettings.js";
import Photo from "../models/Photo.js";

/* ================= LIKE / ACCEPT ================= */
export const likeUser = async (req, res, next) => {
  try {
    const fromUser = req.user._id;
    const { toUserId } = req.body;

    if (String(fromUser) === String(toUserId)) {
      return res.status(400).json({ message: "Cannot like yourself" });
    }

    const reverseLike = await Like.findOne({
      fromUser: toUserId,
      toUser: fromUser,
      status: "pending",
    });

    if (reverseLike) {
      reverseLike.status = "accepted";
      await reverseLike.save();

      await Like.findOneAndUpdate(
        { fromUser, toUser: toUserId },
        { status: "accepted" },
        { upsert: true, new: true }
      );

      const a = String(fromUser) < String(toUserId) ? fromUser : toUserId;
      const b = String(fromUser) < String(toUserId) ? toUserId : fromUser;

      const match = await Match.findOneAndUpdate(
        { user1: a, user2: b },
        { user1: a, user2: b },
        { upsert: true, new: true }
      );

      return res.json({ message: "Match created", match });
    }

    await Like.create({ fromUser, toUser: toUserId });
    res.status(201).json({ message: "Request sent" });

  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Already liked" });
    }
    next(err);
  }
};

/* ================= UNLIKE ================= */
export const unlikeUser = async (req, res, next) => {
  try {
    const fromUser = req.user._id;
    const { toUserId } = req.body;

    await Like.findOneAndDelete({ fromUser, toUser: toUserId });
    await Like.findOneAndDelete({ fromUser: toUserId, toUser: fromUser });

    const a = String(fromUser) < String(toUserId) ? fromUser : toUserId;
    const b = String(fromUser) < String(toUserId) ? toUserId : fromUser;

    await Match.findOneAndDelete({ user1: a, user2: b });

    res.json({ message: "Removed successfully" });
  } catch (err) {
    next(err);
  }
};

/* ================= MATCHES (🔥 PRIVACY FIX HERE) ================= */
// export const listMyMatches = async (req, res, next) => {
//   try {
//     const myId = req.user._id;

//     const matches = await Match.find({
//       $or: [{ user1: myId }, { user2: myId }],
//     }).lean();

//     const result = await Promise.all(
//       matches.map(async (m) => {
//         const otherUser =
//           String(m.user1) === String(myId) ? m.user2 : m.user1;

//         const profile = await UserProfile.findOne({ user: otherUser }).lean();
//         if (!profile) return null;

//         const privacy = await PrivacySettings.findOne({
//           user: otherUser,
//         }).lean();

//         const showProfile = privacy?.showProfile !== false;

//         // 🔐 PROFILE OFF → NO PHOTO + INITIAL ONLY
//         if (!showProfile) {
//           return {
//             matchId: m._id,
//             profile: {
//               user: otherUser,
//               name: profile.name?.charAt(0).toUpperCase() || "?",
//               photos: [],              // ❌ no photo
//               isProfileHidden: true,    // ✅ flag for frontend
//             },
//           };
//         }

//         // ✅ PROFILE ON → FULL DATA
//         const photos = await Photo.find({ user: otherUser })
//           .sort({ order: 1 })
//           .lean();

//         return {
//           matchId: m._id,
//           profile: {
//             ...profile,
//             photos,
//             isProfileHidden: false,
//           },
//         };
//       })
//     );

//     res.json({ matches: result.filter(Boolean) });
//   } catch (err) {
//     console.error("❌ LIST MATCHES ERROR:", err);
//     next(err);
//   }
// };

export const listMyMatches = async (req, res, next) => {
  try {
    const myId = req.user._id;

    const matches = await Match.find({
      $or: [{ user1: myId }, { user2: myId }],
    }).lean();

    const result = await Promise.all(
      matches.map(async (m) => {
        const otherUser =
          String(m.user1) === String(myId) ? m.user2 : m.user1;

        const profile = await UserProfile.findOne({
          user: otherUser,
        }).lean();

        if (!profile) return null;

        const privacy = await PrivacySettings.findOne({
          user: otherUser,
        }).lean();

        const photos = await Photo.find({ user: otherUser })
          .sort({ order: 1 })
          .lean();

        return {
          matchId: m._id,
          profile: {
            user: otherUser,
            name: profile.name,              // ✅ FULL NAME ALWAYS
            photos,
            isProfileHidden: privacy
              ? privacy.showProfile === false
              : false,
          },
        };
      })
    );

    res.json({ matches: result.filter(Boolean) });
  } catch (err) {
    next(err);
  }
};


/* ================= LIKES ================= */
export const getMyLikes = async (req, res, next) => {
  try {
    const myId = req.user._id;

    const likes = await Like.find({
      toUser: myId,
      status: "pending",
    }).populate("fromUser");

    const profiles = await Promise.all(
      likes.map(async (l) => {
        const profile = await UserProfile.findOne({
          user: l.fromUser._id,
        }).lean();

        return {
          ...profile,
          fromUser: l.fromUser._id,
        };
      })
    );

    res.json({ receivedLikes: profiles });
  } catch (err) {
    next(err);
  }
};
