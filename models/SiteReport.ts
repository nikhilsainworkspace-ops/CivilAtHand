import { Schema } from "mongoose";
import { siteReportDef } from "@/lib/entities";
import { getModel, schemaFields } from "@/lib/model-builder";

const SiteReportSchema = new Schema({
  ...schemaFields(siteReportDef.fields),
  reviewedAt: { type: Date, default: null },
}, { timestamps: true, minimize: false });
SiteReportSchema.index({ projectId: 1, date: -1 });
SiteReportSchema.index({ status: 1, date: -1 });

export const SiteReport = getModel<Record<string, unknown>>("SiteReport", SiteReportSchema);
