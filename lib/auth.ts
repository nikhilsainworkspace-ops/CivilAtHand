import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "cah_admin_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;
const secret = () => process.env.ADMIN_SESSION_SECRET || "";

export function authConfigured() {
  return Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD && secret().length >= 32);
}

function sign(payload: string) { return createHmac("sha256", secret()).update(payload).digest("base64url"); }
export function createSessionToken(username: string) {
  const payload = Buffer.from(JSON.stringify({ username, exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS, v: 1 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}
export function verifySessionToken(token?: string) {
  if (!token || !authConfigured()) return false;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return false;
  const expected = Buffer.from(sign(payload)); const provided = Buffer.from(signature);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { username?: string; exp?: number; v?: number };
    return data.v === 1 && data.username === process.env.ADMIN_USERNAME && typeof data.exp === "number" && data.exp > Math.floor(Date.now() / 1000);
  } catch { return false; }
}
export async function isAdmin() {
  const store = await cookies();
  return verifySessionToken(store.get(COOKIE_NAME)?.value);
}
export async function requireAdmin() { return await isAdmin(); }
export async function setAdminCookie(token: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: SESSION_SECONDS });
}
export async function clearAdminCookie() {
  const store = await cookies();
  store.set(COOKIE_NAME, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
}
