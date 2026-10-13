import { NextResponse } from "next/server";
import { endSession } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export async function POST(request: Request) {
  await endSession();
  await audit(request, "logout");
  return NextResponse.json({ ok: true });
}
