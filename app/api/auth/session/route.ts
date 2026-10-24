import { NextResponse } from "next/server";
import { authConfigured, isAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export async function GET() {
  // This is intentionally a read-only probe: background checks must not refresh lastSeenAt forever.
  return NextResponse.json({
    authenticated: await isAdmin({ touch: false }), configured: authConfigured(), twoFactor: Boolean(process.env.ADMIN_TOTP_SECRET?.trim()),
    appName: process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Civil At Hand",
  }, { headers: { "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate", Pragma: "no-cache", Expires: "0", Vary: "Cookie" } });
}
