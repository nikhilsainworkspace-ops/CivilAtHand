# Brand assets

This folder is served publicly by Next.js. To change the logo or favicon without editing application code:

1. Drop your logo image into this folder, for example `brand-logo.png`.
2. In Vercel Environment Variables set `NEXT_PUBLIC_BRAND_LOGO_URL=/brand-logo.png`.
3. Drop your favicon into this folder, for example `favicon.png`, and set `NEXT_PUBLIC_FAVICON_URL=/favicon.png`.
4. Redeploy the project so the new environment values are used.

You can also use public HTTPS image URLs instead of files. Use small, reasonably sized image files; a square transparent PNG or SVG is a good logo format. Do not put passwords, database exports, private documents or contact data in this folder because files here are public.
