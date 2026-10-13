import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { dbConnect } from "@/lib/db";
import { InputError } from "@/lib/errors";
import { normalizePrivateNoteInput } from "@/lib/private-notes";
import { PrivateNote } from "@/models/PrivateNote";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  try {
    await dbConnect();
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim().slice(0, 100);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};
    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(escaped, "i");
      filter.$or = [{ title: re }, { content: re }, { tags: re }];
    }
    const notes = await PrivateNote.find(filter).sort({ archived: 1, pinned: -1, updatedAt: -1 }).limit(1000).lean();
    return NextResponse.json({ notes }, { headers: { "Cache-Control": "no-store", "Pragma": "no-cache" } });
  } catch (error) {
    console.error("Private notes list error:", error);
    return NextResponse.json({ error: "Could not load private notes. Check the database connection." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  try {
    let payload: Record<string, unknown>;
    try { payload = await request.json() as Record<string, unknown>; }
    catch { return NextResponse.json({ error: "Send a valid JSON note." }, { status: 400 }); }
    const normalized = normalizePrivateNoteInput(payload);
    await dbConnect();
    const note = await PrivateNote.create(normalized);
    // Keep note titles and bodies out of the activity log.
    await audit(request, "private-note-created");
    return NextResponse.json({ note: note.toObject() }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof InputError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Private note create error:", error);
    return NextResponse.json({ error: "Could not save this note. Check the database connection and try again." }, { status: 503 });
  }
}
