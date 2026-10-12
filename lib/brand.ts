export const brand = {
  name: process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Civil At Hand",
  tagline: process.env.NEXT_PUBLIC_APP_TAGLINE?.trim() || "Your civil works network, organised.",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") || "",
  color: /^#[0-9a-fA-F]{6}$/.test(process.env.NEXT_PUBLIC_BRAND_COLOR || "")
    ? process.env.NEXT_PUBLIC_BRAND_COLOR!
    : "#176b59",
  logoUrl: process.env.NEXT_PUBLIC_BRAND_LOGO_URL?.trim() || "/civil-at-hand-logo.png",
  faviconUrl: process.env.NEXT_PUBLIC_FAVICON_URL?.trim() || "/favicon.ico",
};

export function getBaseUrl(requestUrl?: string) {
  if (brand.siteUrl) return brand.siteUrl;
  if (requestUrl) return new URL(requestUrl).origin;
  return "http://localhost:3000";
}
