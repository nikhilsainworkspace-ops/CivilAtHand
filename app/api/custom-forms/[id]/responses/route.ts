import mongoose from "mongoose";
import { adminHandler, json } from "@/lib/api-helpers";
import { dbConnect } from "@/lib/db";
import { CustomForm } from "@/models/CustomForm";
import { CustomFormResponse } from "@/models/CustomFormResponse";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export const GET = adminHandler<Context>("Custom form responses", async (_request, context) => {
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) return json({ error: "Form not found." }, 404);
  await dbConnect();
  const form = await CustomForm.findById(id).select("title fields submissions").lean();
  if (!form) return json({ error: "Form not found." }, 404);
  const responses = await CustomFormResponse.find({ formId: id }).sort({ submittedAt: -1 }).limit(5000).lean();
  return json({ form, responses });
});
