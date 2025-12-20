import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

// Load .env before Cloudinary config
dotenv.config();

// Clear Cloudinary config cache (important!)
delete cloudinary.config().cloud_name;
delete cloudinary.config().api_key;
delete cloudinary.config().api_secret;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME?.trim(),
  api_key: process.env.CLOUDINARY_API_KEY?.trim(),
  api_secret: process.env.CLOUDINARY_API_SECRET?.trim(),
});

console.log("🔥 FINAL CLOUDINARY CONFIG:", cloudinary.config());

export default cloudinary;
