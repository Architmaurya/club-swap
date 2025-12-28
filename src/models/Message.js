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
    // Users for whom this message is hidden ("Delete for Me")
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // If true the message has been deleted for everyone
    deletedForEveryone: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);
