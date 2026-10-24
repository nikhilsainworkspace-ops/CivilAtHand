import { NextResponse } from "next/server";
import { currentSessionHash, isAdmin } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { AdminSession } from "@/models/AdminSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const HEADERS = { "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate", Pragma: "no-cache", Expires: "0" };

/** Touch a valid session only after a real user interaction; background session probes use the read-only endpoint. */
export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401, headers: HEADERS });
  try {
    const sidHash = await currentSessionHash();
    if (!sidHash) return NextResponse.json({ error: "Sign in to continue." }, { status: 401, headers: HEADERS });
    await dbConnect();
    const now = new Date();
    const result = await AdminSession.updateOne(
      { sidHash, revokedAt: null, expiresAt: { $gt: now } },
      { $set: { lastSeenAt: now } },
    );
    if (result.matchedCount < 1) return NextResponse.json({ error: "Your session has expired. Please sign in again." }, { status: 401, headers: HEADERS });
    return NextResponse.json({ ok: true }, { headers: HEADERS });
  } catch (error) {
    console.error("Session activity update failed:", error);
    return NextResponse.json({ error: "Could not confirm the active session." }, { status: 503, headers: HEADERS });
  }
}
