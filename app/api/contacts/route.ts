import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { normalizeContactInput } from "@/lib/contact-input";
import { findDuplicateContacts } from "@/lib/duplicate-check";
import { InputError } from "@/lib/errors";
import { Contact } from "@/models/Contact";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  try {
    await dbConnect();
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim().slice(0, 100);
    const category = url.searchParams.get("category") || "";
    const status = url.searchParams.get("status") || "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(escaped, "i");
      filter.$or = [{ name: re }, { phone: re }, { email: re }, { organization: re }, { city: re }, { state: re }, { tags: re }, { "details.workerTypes": re }, { "details.productCategories": re }, { "details.workSpecialty": re }, { "details.services": re }];
    }
    const limit = Math.min(5000, Math.max(1, Number(url.searchParams.get("limit") || 500)));
    const contacts = await Contact.find(filter).sort({ updatedAt: -1 }).limit(limit).lean();
    return NextResponse.json({ contacts }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Contact list error:", error);
    return NextResponse.json({ error: "Could not load records. Check the database connection." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const normalized = normalizeContactInput(payload);
    await dbConnect();
    if (payload.allowDuplicate !== true) {
      const duplicates = await findDuplicateContacts(normalized.phone, normalized.email);
      if (duplicates.length) {
        return NextResponse.json({ error: "A contact with the same phone number or email already exists.", duplicates }, { status: 409 });
      }
    }
    const contact = await Contact.create(normalized);
    return NextResponse.json({ contact: contact.toObject() }, { status: 201 });
  } catch (error) {
    console.error("Contact create error:", error);
    if (error instanceof InputError) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "Could not save this record. Check the database connection and try again." }, { status: 503 });
  }
}
