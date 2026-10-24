import { adminHandler, json, plain, readJson } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";
import { dbConnect } from "@/lib/db";
import { normalizePublicPageInput } from "@/lib/public-pages";
import { PublicPage } from "@/models/PublicPage";

export const runtime = "nodejs";

export const GET = adminHandler("Public page list error", async () => {
  await dbConnect();
  const items = await PublicPage.find().sort({ navOrder: 1, updatedAt: -1 }).limit(500).lean();
  return json({ items: plain(items) });
});

/** New pages always start as unpublished drafts. */
export const POST = adminHandler("Public page create error", async (request: Request) => {
  const data = normalizePublicPageInput(await readJson(request));
  await dbConnect();
  const created = await PublicPage.create({ ...data, status: "draft", publishedAt: null });
  await audit(request, "public-page-created", data.slug);
  return json({ item: plain(created.toObject()) }, 201);
});
