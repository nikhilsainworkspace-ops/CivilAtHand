import { brand } from "@/lib/brand";
export async function GET() {
  const rawInitials = brand.name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  const initials = /^[A-Z0-9]{1,2}$/.test(rawInitials) ? rawInitials : "C";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="${brand.color}"/><path d="M14 43h36M19 43V29l13-9 13 9v14M26 43V33h12v10" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><text x="32" y="57" font-size="8" font-family="Arial,sans-serif" font-weight="700" text-anchor="middle" fill="#fff">${initials}</text></svg>`;
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600" } });
}
