import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  // The private workspace is never indexed. Owner-published pages under /p/ may be crawled; each page still
  // sends its own robots meta tag, and pages are noindex unless the owner turns indexing on for that page.
  return { rules: [{ userAgent: "*", allow: ["/p/", "/api/site/"], disallow: ["/", "/api/", "/print/", "/join/", "/shared/"] }] };
}
