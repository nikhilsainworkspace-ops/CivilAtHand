import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { authConfigured, createSessionToken, setAdminCookie } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { LoginAttempt } from "@/models/LoginAttempt";

export const runtime = "nodejs";

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a); const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
function clientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",").pop()?.trim();
  const ip = request.headers.get("x-real-ip") || forwarded || "unknown";
  return createHash("sha256").update(`${ip}:${process.env.ADMIN_SESSION_SECRET || "civil-at-hand"}`).digest("hex");
}

export async function POST(request: Request) {
  if (!authConfigured()) return NextResponse.json({ error: "Admin login is not configured. Set ADMIN_USERNAME, ADMIN_PASSWORD and a 32+ character ADMIN_SESSION_SECRET in environment variables." }, { status: 503 });
  let body: { username?: string; password?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Please send a valid login form." }, { status: 400 }); }
  const username = String(body.username || "").slice(0, 200);
  const password = String(body.password || "").slice(0, 1000);
  try {
    await dbConnect();
    const key = clientKey(request);
    const attempt = (await LoginAttempt.findOne({ key }).lean()) as unknown as { count?: number; windowStart?: Date; blockedUntil?: Date | null } | null;
    if (attempt?.blockedUntil && new Date(attempt.blockedUntil).getTime() > Date.now()) {
      return NextResponse.json({ error: "Too many failed attempts. Please wait 15 minutes before trying again." }, { status: 429 });
    }
    const valid = safeEqual(username, process.env.ADMIN_USERNAME!) && safeEqual(password, process.env.ADMIN_PASSWORD!);
    if (!valid) {
      const now = new Date();
      const oldWindow = !attempt?.windowStart || now.getTime() - new Date(attempt.windowStart).getTime() > 15 * 60 * 1000;
      const count = oldWindow ? 1 : Number(attempt?.count || 0) + 1;
      await LoginAttempt.findOneAndUpdate({ key }, { $set: { count, windowStart: oldWindow ? now : attempt?.windowStart || now, blockedUntil: count >= 8 ? new Date(now.getTime() + 15 * 60 * 1000) : null } }, { upsert: true, new: true });
      return NextResponse.json({ error: count >= 8 ? "Too many failed attempts. Please wait 15 minutes." : "Username or password is incorrect." }, { status: count >= 8 ? 429 : 401 });
    }
    await LoginAttempt.deleteOne({ key });
    await setAdminCookie(createSessionToken(process.env.ADMIN_USERNAME!));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin login/database error:", error);
    return NextResponse.json({ error: "Cannot reach MongoDB. Check MONGODB_URI and Atlas network access." }, { status: 503 });
  }
}
