import { z } from "zod";
import PrivacySettings from "../models/PrivacySettings.js";

/* ================= UPDATE SCHEMA ================= */
export const privacySchema = z.object({
  body: z.object({
    showProfile: z.boolean().optional(),
    showOnlineStatus: z.boolean().optional(),
    locationPermission: z.boolean().optional(),
  }),
});

/* ================= UPDATE MY PRIVACY ================= */
export const updatePrivacy = async (req, res, next) => {
  try {
    const update = {};

    if (typeof req.body.showProfile === "boolean")
      update.showProfile = req.body.showProfile;

    if (typeof req.body.showOnlineStatus === "boolean")
      update.showOnlineStatus = req.body.showOnlineStatus;

    if (typeof req.body.locationPermission === "boolean")
      update.locationPermission = req.body.locationPermission;

    const settings = await PrivacySettings.findOneAndUpdate(
      { user: req.user._id },
      { $set: update },
      { new: true, upsert: true }
    );

    res.json(settings);
  } catch (err) {
    next(err);
  }
};

/* ================= GET OTHER USER ONLINE STATUS ================= */
export const getUserOnlineStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const settings = await PrivacySettings.findOne({ user: userId }).lean();

    res.json({
      showOnlineStatus: settings?.showOnlineStatus ?? true,
    });
  } catch (err) {
    next(err);
  }
};
