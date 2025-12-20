import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    match: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Match",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: String,

    status: {
      type: String,
      enum: ["sending", "sent", "delivered", "read"],
      default: "sent",
    },

    reactions: {
      type: Map,
      of: Number, // emoji -> count
      default: {},
    },
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);
