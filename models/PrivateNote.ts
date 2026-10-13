import mongoose, { Schema, type Model } from "mongoose";
import type { PrivateNoteDoc } from "@/lib/types";

/** Private notes belong to the single signed-in workspace admin and are never included in public share views. */
const PrivateNoteSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  content: { type: String, trim: false, maxlength: 20000, default: "" },
  tags: { type: [String], default: [] },
  pinned: { type: Boolean, default: false, index: true },
  archived: { type: Boolean, default: false, index: true },
}, { timestamps: true, minimize: false });

PrivateNoteSchema.index({ archived: 1, pinned: -1, updatedAt: -1 });

export const PrivateNote = (mongoose.models.PrivateNote || mongoose.model("PrivateNote", PrivateNoteSchema)) as unknown as Model<PrivateNoteDoc>;
