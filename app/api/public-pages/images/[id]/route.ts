import mongoose from "mongoose";
import { isAdmin } from "@/lib/auth";
import { adminHandler, ConflictError, json } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";
import { dbConnect } from "@/lib/db";
import { InputError } from "@/lib/errors";
import { PageImage } from "@/models/PageImage";
import { PublicPage } from "@/models/PublicPage";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

/** Admin preview of an uploaded page image (published pages use /api/site/images/…). */
export async function GET(_request: Request, context: Context) {
  if (!(await isAdmin())) return new Response("Sign in to continue.", { status: 401, headers });
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) return new Response("Not found", { status: 404, headers });
  await dbConnect();
  const image = await PageImage.findById(id).select("+data").lean() as { mimeType: string; size: number; data: Buffer } | null;
  if (!image) return new Response("Not found", { status: 404, headers });
  return new Response(new Uint8Array(image.data), { headers: { ...headers, "Content-Type": image.mimeType, "Content-Length": String(image.size) } });
}

export const DELETE = adminHandler("Page image delete error", async (request: Request, context: Context) => {
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) throw new InputError("Invalid image.");
  await dbConnect();
  const used = await PublicPage.exists({ $or: [{ coverImageId: id }, { "blocks.imageIds": id }] });
  if (used) throw new ConflictError("This image is used on a page. Remove it from the page first.");
  await PageImage.deleteOne({ _id: id });
  await audit(request, "public-page-image-deleted", id);
  return json({ ok: true });
});
