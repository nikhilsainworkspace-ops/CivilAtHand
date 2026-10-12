import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { normalizeContactInput } from "@/lib/contact-input";
import { Contact } from "@/models/Contact";
import mongoose from "mongoose";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid record ID." }, { status: 400 });
  try {
    const payload = await request.json() as Record<string, unknown>;
    await dbConnect();
    const existing = await Contact.findById(id).lean();
    if (!existing) return NextResponse.json({ error: "Record not found." }, { status: 404 });
    const normalized = normalizeContactInput(payload);
    // Editing a record must not erase how it entered the system.
    normalized.source = existing.source || normalized.source;
    normalized.linkId = existing.linkId || normalized.linkId;
    const contact = await Contact.findByIdAndUpdate(id, normalized, { new: true, runValidators: true }).lean();
    if (!contact) return NextResponse.json({ error: "Record not found." }, { status: 404 });
    return NextResponse.json({ contact });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update this record.";
    console.error("Contact update error:", error);
    const validationError = /required|provide|complete|valid civil-work category|invalid record ID/i.test(message);
    return NextResponse.json({ error: message }, { status: validationError ? 400 : 503 });
  }
}

export async function DELETE(_request: Request, context: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid record ID." }, { status: 400 });
  try {
    await dbConnect();
    const result = await Contact.findByIdAndDelete(id);
    if (!result) return NextResponse.json({ error: "Record not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Contact delete error:", error);
    return NextResponse.json({ error: "Could not delete this record." }, { status: 503 });
  }
}
