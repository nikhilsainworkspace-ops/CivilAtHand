import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { authConfigured, startSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { dbConnect } from "@/lib/db";
import { clientIpFromHeaders } from "@/lib/security";
import { isValidTotpSecret, verifyTotp } from "@/lib/totp";
import { LoginAttempt } from "@/models/LoginAttempt";

export const runtime = "nodejs";

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a); const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
function clientKey(request: Request) {
  const ip = clientIpFromHeaders((name) => request.headers.get(name));
  return createHash("sha256").update(`${ip}:${process.env.ADMIN_SESSION_SECRET || "civil-at-hand"}`).digest("hex");
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error &&
    (error as { code?: unknown }).code === 11000;
}

/** Atomically reserves a TOTP time step, so simultaneous requests cannot reuse the same code. */
async function reserveTotpStep(step: number): Promise<boolean> {
  const now = new Date();
  try {
    await LoginAttempt.updateOne(
      { key: "totp:last" },
      { $setOnInsert: { count: 0, windowStart: now, blockedUntil: null } },
      { upsert: true },
    );
  } catch (error) {
    // Two first-time requests may race to create the tracking row. The unique key means
    // one wins; the other can continue to the atomic conditional update below.
    if (!isDuplicateKeyError(error)) throw error;
  }

  const reserved = await LoginAttempt.updateOne(
    { key: "totp:last", count: { $lt: step } },
    { $set: { count: step } },
  );
  return reserved.modifiedCount === 1;
}

export async function POST(request: Request) {
  if (!authConfigured()) return NextResponse.json({ error: "Admin login is not configured. Set ADMIN_USERNAME, ADMIN_PASSWORD and a 32+ character ADMIN_SESSION_SECRET in environment variables." }, { status: 503 });
  // If you turned on 2FA but the secret is malformed, refuse to sign in rather than silently skipping 2FA.
  const totpEnv = process.env.ADMIN_TOTP_SECRET?.trim();
  if (totpEnv && !isValidTotpSecret(totpEnv)) return NextResponse.json({ error: "ADMIN_TOTP_SECRET is set but is not a valid authenticator key. Fix or remove it in environment variables." }, { status: 503 });
  let body: { username?: string; password?: string; code?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Please send a valid login form." }, { status: 400 }); }
  const username = String(body.username || "").slice(0, 200);
  const password = String(body.password || "").slice(0, 1000);
  const code = String(body.code || "").slice(0, 20);
  try {
    await dbConnect();
    const key = clientKey(request);
    const attempt = (await LoginAttempt.findOne({ key }).lean()) as unknown as { count?: number; windowStart?: Date; blockedUntil?: Date | null } | null;
    if (attempt?.blockedUntil && new Date(attempt.blockedUntil).getTime() > Date.now()) {
      return NextResponse.json({ error: "Too many failed attempts. Please wait 15 minutes before trying again." }, { status: 429 });
    }
    // Evaluate every check (no short-circuit) so timing does not reveal which part was wrong.
    const userOk = safeEqual(username, process.env.ADMIN_USERNAME!);
    const passOk = safeEqual(password, process.env.ADMIN_PASSWORD!);
    let codeOk = true; let step = 0;
    if (totpEnv) {
      const matched = verifyTotp(totpEnv, code);
      codeOk = matched !== null;
      if (matched !== null) step = matched;
    }
    // Only consume a code after the username and password are also correct. The database
    // conditional update makes the one-use rule safe even if two sign-in requests race.
    if (totpEnv && userOk && passOk && codeOk) codeOk = await reserveTotpStep(step);
    if (!(userOk && passOk && codeOk)) {
      const now = new Date();
      const oldWindow = !attempt?.windowStart || now.getTime() - new Date(attempt.windowStart).getTime() > 15 * 60 * 1000;
      const count = oldWindow ? 1 : Number(attempt?.count || 0) + 1;
      await LoginAttempt.findOneAndUpdate({ key }, { $set: { count, windowStart: oldWindow ? now : attempt?.windowStart || now, blockedUntil: count >= 8 ? new Date(now.getTime() + 15 * 60 * 1000) : null } }, { upsert: true, new: true });
      await audit(request, "login-failed", count >= 8 ? "Locked for 15 minutes" : "");
      const message = totpEnv ? "Username, password or 6-digit code is incorrect." : "Username or password is incorrect.";
      return NextResponse.json({ error: count >= 8 ? "Too many failed attempts. Please wait 15 minutes." : message }, { status: count >= 8 ? 429 : 401 });
    }
    await LoginAttempt.deleteOne({ key });
    await startSession(request);
    await audit(request, "login", totpEnv ? "with 2FA" : "");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin login/database error:", error);
    return NextResponse.json({ error: "Cannot reach MongoDB. Check MONGODB_URI and Atlas network access." }, { status: 503 });
  }
}
