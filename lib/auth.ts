import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { dbConnect } from "@/lib/db";
import { clientIpFromHeaders, fetchSiteAllowed, maskIp, shortAgent } from "@/lib/security";
import { AdminSession } from "@/models/AdminSession";

// Sessions are stored in MongoDB (as a hash), so signing out really ends the session, you can see your
// signed-in devices, an idle session expires, and "sign out everywhere" works. The cookie holds a random
// id plus an HMAC signature, so forged cookies are rejected before the database is even queried.

const IS_PROD = process.env.NODE_ENV === "production";
// The __Host- prefix makes browsers refuse the cookie unless it is Secure, host-only and path "/".
export const COOKIE_NAME = IS_PROD ? "__Host-cah_session" : "cah_session";

const secret = () => process.env.ADMIN_SESSION_SECRET || "";
function envNumber(name: string, fallback: number, min: number, max: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= min && value <= max ? value : fallback;
}
const sessionSeconds = () => envNumber("ADMIN_SESSION_HOURS", 24 * 7, 1, 24 * 30) * 3600;
const idleMs = () => envNumber("ADMIN_IDLE_MINUTES", 720, 5, 60 * 24 * 30) * 60_000;

export function authConfigured() {
  return Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD && secret().length >= 32);
}

const sign = (value: string) => createHmac("sha256", secret()).update(value).digest("base64url");
const hashSid = (sid: string) => createHash("sha256").update(sid).digest("hex");

function readCookieValue(raw?: string): string | null {
  if (!raw || !authConfigured()) return null;
  const [sid, signature, extra] = raw.split(".");
  if (!sid || !signature || extra) return null;
  const expected = Buffer.from(sign(sid)); const provided = Buffer.from(signature);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return null;
  return sid;
}

type SessionRow = { _id: unknown; lastSeenAt: Date };

export async function isAdmin(): Promise<boolean> {
  if (!authConfigured()) return false;
  try {
    const requestHeaders = await headers();
    if (!fetchSiteAllowed(requestHeaders.get("sec-fetch-site"))) return false; // blocks cross-site request forgery
    const store = await cookies();
    const sid = readCookieValue(store.get(COOKIE_NAME)?.value);
    if (!sid) return false;
    await dbConnect();
    const now = new Date();
    const session = (await AdminSession.findOne({ sidHash: hashSid(sid), revokedAt: null, expiresAt: { $gt: now } }).lean()) as unknown as SessionRow | null;
    if (!session) return false;
    const idle = now.getTime() - new Date(session.lastSeenAt).getTime();
    if (idle > idleMs()) { await AdminSession.updateOne({ _id: session._id }, { $set: { revokedAt: now } }); return false; }
    if (idle > 5 * 60_000) await AdminSession.updateOne({ _id: session._id }, { $set: { lastSeenAt: now } });
    return true;
  } catch (error) {
    console.error("Session check failed:", error);
    return false;
  }
}
export async function requireAdmin() { return await isAdmin(); }

/** Creates a session row and sets the cookie. Call only after the password (and 2FA code) are verified. */
export async function startSession(request: Request) {
  const sid = randomBytes(32).toString("base64url");
  const now = Date.now();
  await dbConnect();
  await AdminSession.create({
    sidHash: hashSid(sid), ip: maskIp(clientIpFromHeaders((name) => request.headers.get(name))), agent: shortAgent(request.headers.get("user-agent")),
    lastSeenAt: new Date(now), expiresAt: new Date(now + sessionSeconds() * 1000),
  });
  const store = await cookies();
  store.set(COOKIE_NAME, `${sid}.${sign(sid)}`, { httpOnly: true, secure: IS_PROD, sameSite: "strict", path: "/", maxAge: sessionSeconds() });
}

/** Hash of the current browser's session id (used to mark "this device" in the sessions list). */
export async function currentSessionHash(): Promise<string | null> {
  const store = await cookies();
  const sid = readCookieValue(store.get(COOKIE_NAME)?.value);
  return sid ? hashSid(sid) : null;
}

export async function endSession() {
  try {
    const hash = await currentSessionHash();
    if (hash) { await dbConnect(); await AdminSession.updateOne({ sidHash: hash }, { $set: { revokedAt: new Date() } }); }
  } catch (error) { console.error("Session end failed:", error); }
  const store = await cookies();
  store.set(COOKIE_NAME, "", { httpOnly: true, secure: IS_PROD, sameSite: "strict", path: "/", maxAge: 0 });
}
