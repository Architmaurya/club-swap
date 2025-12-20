import { z } from "zod";
import Club from "../models/Club.js";

// ------------------------
// Validation Schema
// ------------------------
export const createClubSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    description: z.string().optional(),
    category: z.string().optional(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180)
  })
});

// ------------------------
// Create Club (Admin Only)
// ------------------------
export const createClub = async (req, res, next) => {
  try {
    console.log("➡️ Create Club Request by Admin:", req.user._id);
    console.log("➡️ Request Body:", req.body);

    const { name, description, category, latitude, longitude } = req.body;

    console.log("📌 Creating club in database...");

    const club = await Club.create({
      name,
      description,
      category,
      location: {
        type: "Point",
        coordinates: [longitude, latitude]
      },
      createdBy: req.user._id
    });

    console.log("✔ Club Created:", club._id);

    res.status(201).json({ club });
  } catch (err) {
    console.log("❌ Error Creating Club:", err);
    next(err);
  }
};

// ------------------------
// List Active Clubs
// ------------------------
export const listClubs = async (req, res, next) => {
  try {
    console.log("➡️ Fetching all active clubs...");

    const clubs = await Club.find({ isActive: true }).lean();

    console.log(`✔ ${clubs.length} clubs found`);

    res.json(clubs);
  } catch (err) {
    console.log("❌ Error Fetching Clubs:", err);
    next(err);
  }
};
