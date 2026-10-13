import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { AuditLog } from "@/models/AuditLog";

export const runtime = "nodejs";
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  try {
    await dbConnect();
    const entries = await AuditLog.find().sort({ at: -1 }).limit(150).lean();
    return NextResponse.json({ entries }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Audit list error:", error);
    return NextResponse.json({ error: "Could not load the activity log." }, { status: 503 });
  }
}
