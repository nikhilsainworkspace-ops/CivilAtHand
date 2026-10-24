import { Schema } from "mongoose";
import { tenderDef } from "@/lib/entities";
import { getModel, schemaFields } from "@/lib/model-builder";

const TenderSchema = new Schema(schemaFields(tenderDef.fields), { timestamps: true, minimize: false });
TenderSchema.index({ status: 1, submissionDeadline: 1 });

export const Tender = getModel<Record<string, unknown>>("Tender", TenderSchema);
