import type { Metadata, Viewport } from "next";
import type { CSSProperties, ReactNode } from "react";
import "./globals.css";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: `${brand.name} | Civil Works Network`,
  description: brand.tagline,
  applicationName: brand.name,
  metadataBase: brand.siteUrl ? new URL(brand.siteUrl) : undefined,
  icons: { icon: brand.faviconUrl },
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: brand.color };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en"><body style={{ "--brand": brand.color } as CSSProperties}>{children}</body></html>;
}
