import { Schema } from "mongoose";
import { getModel } from "@/lib/model-builder";

const CustomFormResponseSchema = new Schema({
  formId: { type: Schema.Types.ObjectId, ref: "CustomForm", required: true, index: true },
  answers: { type: Schema.Types.Mixed, required: true, default: {} },
  submittedAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true, minimize: false });

CustomFormResponseSchema.index({ formId: 1, submittedAt: -1 });

export const CustomFormResponse = getModel<Record<string, unknown>>("CustomFormResponse", CustomFormResponseSchema);
