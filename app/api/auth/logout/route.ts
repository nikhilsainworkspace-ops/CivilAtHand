import { NextResponse } from "next/server";
import { endSession } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const serverConfirmed = await endSession();
  await audit(request, serverConfirmed ? "logout" : "logout-failed", serverConfirmed ? "" : "Browser cookie cleared; MongoDB revocation could not be confirmed");
  // Supported browsers clear this origin's HTTP cache and web storage. The session cookie is
  // separately expired by endSession because it is HttpOnly. This does not erase downloaded files.
  const headers = {
    "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    "Clear-Site-Data": '"cache", "storage"',
    "Referrer-Policy": "no-referrer",
  };
  if (!serverConfirmed) return NextResponse.json({ error: "Your browser data was cleared, but server sign-out could not be confirmed. Reconnect and sign out again." }, { status: 503, headers });
  return NextResponse.json({ ok: true }, { headers });
}
