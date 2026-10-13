import { NextResponse } from "next/server";
import { authConfigured, isAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export async function GET() {
  return NextResponse.json({
    authenticated: await isAdmin(), configured: authConfigured(), twoFactor: Boolean(process.env.ADMIN_TOTP_SECRET?.trim()),
    appName: process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Civil At Hand",
  }, { headers: { "Cache-Control": "no-store" } });
}
