# Instructions for coding agents working on Civil At Hand

## Product purpose
Civil At Hand is a private, personal management workspace for a civil engineering/construction business network. It organises:
- Manpower suppliers and skilled labour teams
- Material, equipment and safety suppliers / vendors
- Subcontractors and contractors
- Project liaisoning, coordination and outsourcing
- Investors and project execution partners
- Business development opportunities and client introductions
- Working capital / financial resources contacts
- Joint ventures and strategic partnerships
- Clients including builders, EPC companies, factories and infrastructure developers

Do not add unrelated consumer/social-media features. Keep the product simple for one admin to operate, phone responsive, and understandable to professionals with different literacy levels. Public form prompts should use English and Hindi together where practical.

## Non-negotiable architecture
- Next.js App Router deployed on Vercel.
- MongoDB persistence via Mongoose. Never replace database persistence with browser-only storage.
- Admin credentials live only in `ADMIN_USERNAME` and `ADMIN_PASSWORD`. The signed-cookie key is `ADMIN_SESSION_SECRET`. Never hardcode real credentials or expose secrets through `NEXT_PUBLIC_*`.
- Every admin API route must call `isAdmin()` before reading or changing private records.
- Public registration is permitted only through `/join/[token]`, where the unguessable token maps to an active `ShareLink`. Public users must never be able to list/search records, see the admin panel, or see another form's submissions.
- A link can be paused, expired, or revoked. Keep that behaviour intact.
- Brand name, tagline, canonical URL, colour, logo and favicon are controlled by environment variables. Do not hardcode the business name into UI logic in a way that blocks rebranding.
- This project is designed as a personal single-admin app, not a multi-tenant/SaaS product.

## Where to extend it
- Add a civil-work contact type and its bilingual fields in `lib/categories.ts`. The dashboard form editor, link generator and export builder consume this schema.
- Contact-specific answers live in `Contact.details`; preserve them during editing and include them in Excel/CSV export.
- Add any new server endpoint under `app/api` and protect admin routes with `isAdmin()`.
- Keep the dashboard and public forms responsive at both small phone widths and desktop widths. Avoid breaking unrelated sections when fixing a component.
- For database changes, update the corresponding Mongoose model under `models/` and validate all untrusted input server-side.

## Before finishing a change
1. Run `npm run build` and resolve TypeScript/Next.js errors.
2. Check login, dashboard session/logout, contact create/edit/delete, link create/pause/reactivate, public submission and export paths.
3. Do not commit `.env.local`, database URIs, passwords, session secrets or real contact data.
4. Keep README setup and environment-variable documentation current.
