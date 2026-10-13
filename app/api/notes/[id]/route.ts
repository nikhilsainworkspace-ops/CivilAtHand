import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { dbConnect } from "@/lib/db";
import { InputError } from "@/lib/errors";
import { normalizePrivateNoteInput } from "@/lib/private-notes";
import { PrivateNote } from "@/models/PrivateNote";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid note ID." }, { status: 400 });
  try {
    let payload: Record<string, unknown>;
    try { payload = await request.json() as Record<string, unknown>; }
    catch { return NextResponse.json({ error: "Send a valid JSON note." }, { status: 400 }); }
    const normalized = normalizePrivateNoteInput(payload);
    await dbConnect();
    const note = await PrivateNote.findByIdAndUpdate(id, normalized, { new: true, runValidators: true }).lean();
    if (!note) return NextResponse.json({ error: "Note not found." }, { status: 404 });
    await audit(request, "private-note-updated");
    return NextResponse.json({ note }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof InputError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Private note update error:", error);
    return NextResponse.json({ error: "Could not update this note." }, { status: 503 });
  }
}

export async function PATCH(request: Request, context: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid note ID." }, { status: 400 });
  try {
    let body: { action?: unknown; value?: unknown };
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: "Send a valid JSON request." }, { status: 400 }); }
    if ((body.action !== "pinned" && body.action !== "archived") || typeof body.value !== "boolean") {
      return NextResponse.json({ error: "Choose a valid note action." }, { status: 400 });
    }
    await dbConnect();
    const note = await PrivateNote.findByIdAndUpdate(id, { $set: { [body.action]: body.value } }, { new: true, runValidators: true }).lean();
    if (!note) return NextResponse.json({ error: "Note not found." }, { status: 404 });
    await audit(request, body.action === "pinned" ? (body.value ? "private-note-pinned" : "private-note-unpinned") : (body.value ? "private-note-archived" : "private-note-restored"));
    return NextResponse.json({ note }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Private note action error:", error);
    return NextResponse.json({ error: "Could not update this note." }, { status: 503 });
  }
}

export async function DELETE(request: Request, context: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid note ID." }, { status: 400 });
  try {
    await dbConnect();
    const note = await PrivateNote.findByIdAndDelete(id);
    if (!note) return NextResponse.json({ error: "Note not found." }, { status: 404 });
    await audit(request, "private-note-deleted");
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Private note delete error:", error);
    return NextResponse.json({ error: "Could not delete this note." }, { status: 503 });
  }
}
