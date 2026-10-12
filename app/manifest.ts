import type { MetadataRoute } from "next";
import { brand } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brand.name,
    short_name: brand.name.length > 18 ? brand.name.slice(0, 18).trim() : brand.name,
    description: brand.tagline,
    start_url: "/",
    display: "standalone",
    background_color: "#f5f8f5",
    theme_color: brand.color,
    icons: [
      { src: "/civil-at-hand-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/civil-at-hand-icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
    ],
  };
}
