import { NextResponse } from "next/server";
import { authConfigured, isAdmin } from "@/lib/auth";

export async function GET() {
  return NextResponse.json({ authenticated: await isAdmin(), configured: authConfigured(), appName: process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Civil At Hand" }, { headers: { "Cache-Control": "no-store" } });
}
