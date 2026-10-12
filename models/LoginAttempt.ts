import mongoose, { Schema } from "mongoose";

const LoginAttemptSchema = new Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  windowStart: { type: Date, default: Date.now },
  blockedUntil: { type: Date, default: null },
}, { timestamps: true });
LoginAttemptSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 2 });
export const LoginAttempt = mongoose.models.LoginAttempt || mongoose.model("LoginAttempt", LoginAttemptSchema);
