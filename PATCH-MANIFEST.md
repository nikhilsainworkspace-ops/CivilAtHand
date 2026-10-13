# Civil At Hand — cumulative incremental update manifest

This is a **patch ZIP, not a full project**. It combines the dashboard redesign, navigation accessibility, Task Planner, Private Notes, authenticator replay-race fix and the latest shared-device security hardening. Only new or updated files relative to the originally uploaded project are included. Files not listed below must stay in place.

## Newly added files (19)
- `.env.example`
- `.gitignore`
- `INCREMENTAL-UPDATE-GUIDE.md`
- `NAVIGATION-ACCESSIBILITY-UPDATE.md`
- `PATCH-MANIFEST.md`
- `app/api/notes/route.ts`
- `app/api/notes/[id]/route.ts`
- `app/api/security/preferences/route.ts`
- `app/api/tasks/route.ts`
- `app/api/tasks/[id]/route.ts`
- `components/private-notes-panel.tsx`
- `components/tasks-panel.tsx`
- `lib/private-notes.ts`
- `lib/tasks.ts`
- `models/AdminPreference.ts`
- `models/PrivateNote.ts`
- `models/Task.ts`
- `tests/private-notes.test.ts`

## Updated files (15)
- `README.md` — detailed portal manual, launch steps, data handling and shared-device security limits
- `UPDATES.md` — feature history and security update
- `app/api/auth/login/route.ts` — atomic use of TOTP time-step verification
- `app/api/auth/activity/route.ts` — authenticated heartbeat only on genuine user interaction
- `app/api/auth/logout/route.ts` — session revocation, no-store and Clear-Site-Data response
- `app/api/auth/session/route.ts` — no-store read-only session probe that does not renew idle sessions
- `app/api/backup/route.ts` — includes tasks and private notes in full backup
- `app/globals.css` — dashboard refresh and responsive/scrollable navigation styling
- `components/dashboard.tsx` — redesigned UI, Task Planner/Private Notes integration, nav accessibility, DB-backed auto-lock, logout cleanup and cross-tab/session rechecks
- `components/security-panel.tsx` — clearer storage/logout controls and security guidance
- `lib/auth.ts` — safer 24-hour absolute / 60-minute idle defaults and optional no-touch session checks
- `lib/brand.ts` — default blue-accent brand styling
- `lib/client-api.ts` — app-owned browser storage/cache cleanup helper
- `lib/types.ts` — task and private-note data types
- `next.config.ts` — stronger security headers and no-store headers for the admin shell, APIs and tokenised pages
- `tests/logic.test.ts` — logic checks for incremental features

## Feature summary
- Professional, responsive dashboard and accessible scrollable/searchable sidebar; existing sections stay available.
- Global search for contacts, projects, tasks and active private notes.
- MongoDB-backed Task Planner with priorities, dates, status, search, contacts/projects and CSV export.
- MongoDB-backed Private Notes with create/edit, tags, search, pin, archive/restore, copy, Markdown export and deletion.
- Full JSON backup coverage for tasks, private notes and auto-lock preferences without removing existing backup sections.
- Authenticator time-step replay/race protection.
- **No app-managed business-record persistence in localStorage/sessionStorage/IndexedDB.** Legacy `cah-autolock` storage is no longer read or written; the auto-lock preference is held in MongoDB `AdminPreference`.
- Logout revokes the current server session, expires the HTTP-only cookie, clears browser cache/storage where supported, clears in-memory dashboard data, and notifies other tabs.
- The dashboard rechecks session validity periodically and when the tab becomes visible. Read-only checks do not refresh the server idle timer; a separate throttled, admin-protected heartbeat updates activity only after real user interaction.
- `Cache-Control: no-store` for the admin root, API routes and tokenised form/share pages, plus additional security headers.

## Safe merge
1. Back up the current repository or create a Git commit before applying the patch.
2. Extract this ZIP into the **existing repository root** and preserve folder paths.
3. Allow overwriting matching paths. Do not delete any file that is not in this patch; absent files are unchanged files, not files to remove.
4. Keep current MongoDB/Vercel secrets and database settings. No new environment variable is required. MongoDB creates `tasks`, `privatenotes` and `adminpreferences` collections as needed.
5. Review the added shared-device limitations in `README.md`: a website cannot erase downloaded exports, screenshots, clipboard history, browser-password-manager entries, OS backups or extensions' data.
6. Run `npm run typecheck`, `npm test`, `npm run lint`, and `npm run build`.
7. Push to the existing GitHub repository and check Vercel build logs. Complete the manual checks in `INCREMENTAL-UPDATE-GUIDE.md` before using the release with important records.

## Verification status
All 95 TypeScript/TSX source files passed a TypeScript syntax-transpilation check and the ZIP integrity check passes. The dependency install timed out in this environment, so the full typecheck, full test suite, lint and production build were not completed here. Do not treat deployment as verified until those commands pass in your project environment.
