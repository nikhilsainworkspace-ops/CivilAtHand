import mongoose, { Schema } from "mongoose";

const ContactSchema = new Schema({
  category: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 160 },
  phone: { type: String, trim: true, maxlength: 40, default: "" },
  email: { type: String, trim: true, lowercase: true, maxlength: 180, default: "" },
  organization: { type: String, trim: true, maxlength: 180, default: "" },
  city: { type: String, trim: true, maxlength: 120, default: "" },
  state: { type: String, trim: true, maxlength: 120, default: "" },
  status: { type: String, enum: ["new", "contacted", "qualified", "active", "on-hold", "closed"], default: "new", index: true },
  source: { type: String, enum: ["manual", "public-link", "import"], default: "manual" },
  linkId: { type: String, default: "" },
  tags: { type: [String], default: [] },
  notes: { type: String, maxlength: 6000, default: "" },
  followUpAt: { type: Date, default: null },
  details: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true, minimize: false });

ContactSchema.index({ name: "text", organization: "text", email: "text", phone: "text", city: "text", state: "text" });
export const Contact = mongoose.models.Contact || mongoose.model("Contact", ContactSchema);
