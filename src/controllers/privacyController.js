import { z } from "zod";
import PrivacySettings from "../models/PrivacySettings.js";

export const privacySchema = z.object({
  body: z.object({
    showProfile: z.boolean().optional(),
    showOnlineStatus: z.boolean().optional(),
    locationPermission: z.boolean().optional(),
  }),
});

export const updatePrivacy = async (req, res, next) => {
  try {
    console.log("➡️ PRIVACY UPDATE Request");
    console.log("   User:", req.user._id);
    console.log("   Body:", req.body);

    const { showProfile, showOnlineStatus, locationPermission } = req.body;

    console.log("🔍 Fetching existing privacy settings...");
    const oldSettings = await PrivacySettings.findOne({ user: req.user._id }).lean();
    console.log("   Existing settings:", oldSettings || "No previous settings");

    console.log("🛠 Updating privacy settings...");

    const settings = await PrivacySettings.findOneAndUpdate(
      { user: req.user._id },
      { showProfile, showOnlineStatus, locationPermission },
      { new: true, upsert: true }
    );

    console.log("✔ Privacy settings updated:", settings);

    res.json(settings);

  } catch (err) {
    console.log("❌ Error in updatePrivacy:", err);
    next(err);
  }
};
