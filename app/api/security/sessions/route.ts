import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { currentSessionHash, isAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { dbConnect } from "@/lib/db";
import { AdminSession } from "@/models/AdminSession";

export const runtime = "nodejs";
type Row = { _id: unknown; sidHash: string; ip: string; agent: string; createdAt: Date; lastSeenAt: Date };

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  try {
    await dbConnect();
    const current = await currentSessionHash();
    const rows = (await AdminSession.find({ revokedAt: null, expiresAt: { $gt: new Date() } }).sort({ lastSeenAt: -1 }).limit(25).lean()) as unknown as Row[];
    return NextResponse.json({ sessions: rows.map((r) => ({ _id: String(r._id), ip: r.ip, agent: r.agent, createdAt: r.createdAt, lastSeenAt: r.lastSeenAt, current: r.sidHash === current })) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Sessions list error:", error);
    return NextResponse.json({ error: "Could not load signed-in devices." }, { status: 503 });
  }
}

/** DELETE ?id=<session id> signs out one device; DELETE ?others=1 signs out every device except this one. */
export async function DELETE(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  try {
    await dbConnect();
    const url = new URL(request.url);
    const current = await currentSessionHash();
    const now = new Date();
    if (url.searchParams.get("others") === "1") {
      const result = await AdminSession.updateMany({ revokedAt: null, sidHash: { $ne: current || "" } }, { $set: { revokedAt: now } });
      await audit(request, "sessions-revoked", "all other devices");
      return NextResponse.json({ ok: true, revoked: (result as unknown as { modifiedCount?: number }).modifiedCount ?? 0 });
    }
    const id = url.searchParams.get("id") || "";
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid device." }, { status: 400 });
    await AdminSession.updateOne({ _id: id }, { $set: { revokedAt: now } });
    await audit(request, "session-revoked", "one device");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Session revoke error:", error);
    return NextResponse.json({ error: "Could not sign out that device." }, { status: 503 });
  }
}
