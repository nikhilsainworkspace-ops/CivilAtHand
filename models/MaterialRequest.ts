import { Schema } from "mongoose";
import { materialRequestDef } from "@/lib/entities";
import { getModel, schemaFields } from "@/lib/model-builder";

const MaterialRequestSchema = new Schema({
  ...schemaFields(materialRequestDef.fields),
  number: { type: String, required: true, maxlength: 40, index: true },
  decidedAt: { type: Date, default: null },
}, { timestamps: true, minimize: false });
MaterialRequestSchema.index({ status: 1, neededBy: 1 });
MaterialRequestSchema.index({ projectId: 1 });

export const MaterialRequest = getModel<Record<string, unknown>>("MaterialRequest", MaterialRequestSchema);
