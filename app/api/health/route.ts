import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { dbConnect } from "@/lib/db";

export const runtime = "nodejs";
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  try {
    await dbConnect();
    return NextResponse.json({ database: "connected", databaseName: process.env.MONGODB_DB || "from connection string", authConfigured: Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD && (process.env.ADMIN_SESSION_SECRET || "").length >= 32) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ database: "error", message: "MongoDB could not be reached. Check your URI, database user and Atlas network access." }, { status: 503 });
  }
}
