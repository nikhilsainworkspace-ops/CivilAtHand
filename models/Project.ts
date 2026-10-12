import mongoose, { Schema, type Model } from "mongoose";
import type { ProjectDoc } from "@/lib/types";

const ProjectSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  clientName: { type: String, trim: true, maxlength: 160, default: "" },
  clientContactId: { type: String, default: "" },
  linkedContactIds: { type: [String], default: [] },
  city: { type: String, trim: true, maxlength: 120, default: "" },
  state: { type: String, trim: true, maxlength: 120, default: "" },
  projectType: { type: String, trim: true, maxlength: 120, default: "" },
  status: { type: String, enum: ["lead", "quoted", "negotiation", "ongoing", "completed", "on-hold", "lost"], default: "lead", index: true },
  estimatedValue: { type: Number, min: 0, default: null },
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
  followUpAt: { type: Date, default: null },
  source: { type: String, trim: true, maxlength: 120, default: "" },
  notes: { type: String, maxlength: 6000, default: "" },
}, { timestamps: true, minimize: false });
ProjectSchema.index({ followUpAt: 1 });

export const Project = (mongoose.models.Project || mongoose.model("Project", ProjectSchema)) as unknown as Model<ProjectDoc>;
