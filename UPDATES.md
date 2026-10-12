# Civil At Hand: version 2.0 update notes

Everything from version 1 still works (dashboard, login, contacts, 10 categories, public bilingual forms, share links, import, filtered export, WhatsApp/email, PDF print, manifest, logo pack). Records and `/join/<token>` links are untouched: no field was renamed or removed.

## New
- **Projects & leads** (new `Project` collection): stages, client, location, ₹ value, dates, lead source, linked contacts, stage quick-change, export.
- **Follow-ups page**: overdue / today / next 7 days / later for contacts and projects; Done, Tomorrow, +1 week, Call, WhatsApp; menu counter.
- **Duplicate detection**: warning on add/edit (can override), badge, Duplicates filter; smarter phone matching (last 10 digits) in import too.
- **Reports page**: network, pipeline, overdue, monthly growth, sources, busiest links.
- **Projects export** (`/api/export?scope=projects`).
- Print title now uses your configured business name; print layouts for new pages.
- Larger, easier-to-read text on key controls; Hindi text on the "form unavailable" page and public error messages.
- `.gitignore`, `.env.example` (were missing), `npm run typecheck`, `npm test`, HSTS header.

## Fixed
- Strict-TypeScript problems that break `next build`: untyped Mongoose model unions (`mongoose.models.X || mongoose.model(...)`), untyped `.lean()` results, and the ExcelJS buffer response; validation errors now use a typed `InputError` instead of matching message text.
- A malformed `NEXT_PUBLIC_SITE_URL` (for example without `https://`) could crash the whole site at start-up; it is now normalised safely.
- Public submission counter used read-modify-write; now an atomic `$inc`.
- CSV export protected phone numbers starting with `+` with an apostrophe, which then came back on re-import; import now removes that protective apostrophe.
- Dashboard print title was hard-coded to "Civil At Hand".

## Needs no action
No database migration. Environment variables are the same as before (see README); `MONGODB_DB` must stay as it was.
