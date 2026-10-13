# Civil At Hand: incremental productivity/security update

This update is additive. It keeps existing contacts, projects, rates, links, shared databases, exports and security screens. Merge only the files contained in the incremental ZIP into the repository root; allow overwriting files with matching paths. No data migration or new environment variable is needed for the Task Planner.

## Added
- **Persistent Task Planner** (`Task` collection): create, edit, search and filter tasks; due dates, priority, status, notes, and optional links to existing contacts/projects; overdue-first sorting; completion/reopen controls; overdue badge, overview summary, CSV export and activity-log entries.
- **Protected task APIs** (`/api/tasks` and `/api/tasks/[id]`): admin-only list/create/update/status/delete, validation, no-store responses and input limits. Existing endpoints are unchanged.
- **Authenticator replay-race hardening:** the accepted TOTP time step is now atomically claimed after the password is valid, preventing two parallel login requests from both accepting the same code.
- Added task input tests and added the missing `.gitignore` / `.env.example` entries expected by the README. `.env.example` contains placeholders only.

## Verification
Run `npm run typecheck`, `npm test`, `npm run lint`, and `npm run build` after merging. This ZIP is an incremental source patch, not a compiled deployment artifact.

---

# Civil At Hand: version 3.0 update notes

Everything from version 2 still works. No data migration is needed: every new database field is optional, existing records and existing `/join/<token>` links are untouched, and `MONGODB_DB` handling is unchanged.

## New
- **Shared databases** (new `DataRoom` collection, page `/shared/<token>`): sell or share a frozen copy of selected contacts or rates through a private link with required expiry, passcode (scrypt-hashed), open limit, watermark, download switch, price / paid / unpaid tracking, "locked until paid", pause, extend, reset passcode, and an access log.
- **Consent to share:** per-contact "may be shared with clients" (Yes / No / not recorded), an optional checkbox on public forms, and sharing that skips contacts without consent by default. "No" is never shared.
- **Rate book** (new `Rate` collection): rates, supplier comparison, stale flags, export, sharing.
- **Security centre:** 2-step verification (authenticator app), server-side sessions with signed-in devices and real sign-out, idle expiry, browser auto-lock, activity log (180 days), full JSON backup, cross-site request blocking, Content-Security-Policy, `__Host-` cookie.
- **Productivity:** bulk actions, merge duplicates, per-contact history (calls, meetings, site visits), 1-5 rating, Preferred / Avoid flag, import template, "Hide numbers" privacy button, project billed / received / to-collect, receivables and data sales in Reports.
- Per-device rate limits on public form submissions and client-link requests.

## Changed
- Login now uses a MongoDB-backed session. **You will be signed out once after deploying** (old cookies are not valid). `ADMIN_SESSION_SECRET` is still required.
- New optional environment variables: `ADMIN_TOTP_SECRET`, `ADMIN_SESSION_HOURS`, `ADMIN_IDLE_MINUTES` (see `.env.example`).
- Exports and imports are written to the activity log. Contact list responses no longer include the per-contact history (loaded on demand).

## Developer notes
- `npm run check` runs typecheck, unit tests and the access-gate integration test (`tests/integration`, uses Node's experimental module mocking).
- Browser-safe room code lives in `lib/room-shared.ts`; `lib/rooms.ts` uses Node crypto and must not be imported by client components.

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
