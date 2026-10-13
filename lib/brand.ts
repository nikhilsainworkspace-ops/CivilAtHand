// Brand settings come from environment variables so name, logo, favicon, colour and domain
// can be changed in Vercel without touching code. Defaults keep the supplied Civil At Hand logo pack.

function cleanSiteUrl(raw: string | undefined): string {
  const value = (raw || "").trim().replace(/\/+$/, "");
  if (!value) return "";
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try { return new URL(withProtocol).origin; } catch { return ""; }
}

export const brand = {
  name: process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Civil At Hand",
  tagline: process.env.NEXT_PUBLIC_APP_TAGLINE?.trim() || "Your civil works network, organised.",
  siteUrl: cleanSiteUrl(process.env.NEXT_PUBLIC_SITE_URL),
  color: /^#[0-9a-fA-F]{6}$/.test(process.env.NEXT_PUBLIC_BRAND_COLOR || "")
    ? process.env.NEXT_PUBLIC_BRAND_COLOR!
    : "#1769e8",
  logoUrl: process.env.NEXT_PUBLIC_BRAND_LOGO_URL?.trim() || "/civil-at-hand-logo.png",
  faviconUrl: process.env.NEXT_PUBLIC_FAVICON_URL?.trim() || "/favicon.ico",
};

export function getBaseUrl(requestUrl?: string) {
  if (brand.siteUrl) return brand.siteUrl;
  if (requestUrl) return new URL(requestUrl).origin;
  return "http://localhost:3000";
}
