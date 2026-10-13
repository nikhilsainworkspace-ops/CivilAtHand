# Civil At Hand — cumulative incremental update manifest

This is a **patch ZIP, not a full project**. It combines the prior Task Planner, Private Notes, authenticator and dashboard UI changes with the newest sidebar-navigation fix. Its files are only new or updated relative to the uploaded original project. Files not listed below must stay in place.

## Newly added files
- `.env.example`
- `.gitignore`
- `INCREMENTAL-UPDATE-GUIDE.md`
- `NAVIGATION-ACCESSIBILITY-UPDATE.md`
- `PATCH-MANIFEST.md`
- `app/api/notes/route.ts`
- `app/api/notes/[id]/route.ts`
- `app/api/tasks/route.ts`
- `app/api/tasks/[id]/route.ts`
- `components/private-notes-panel.tsx`
- `components/tasks-panel.tsx`
- `lib/private-notes.ts`
- `lib/tasks.ts`
- `models/PrivateNote.ts`
- `models/Task.ts`
- `tests/private-notes.test.ts`

## Updated files
- `README.md` — detailed portal manual and merge/deployment notes, including the new navigation help
- `UPDATES.md` — feature/update history
- `app/api/auth/login/route.ts` — atomic use of TOTP time-step verification
- `app/api/backup/route.ts` — include tasks and private notes in full backup
- `app/globals.css` — dashboard refresh and responsive/scrollable navigation styling
- `components/dashboard.tsx` — dashboard refresh, global search, task/note summaries, and accessible searchable navigation
- `lib/brand.ts` — default blue-accent brand styling
- `lib/types.ts` — task and private-note data types
- `tests/logic.test.ts` — logic checks for the incremental features

## Feature summary
- Improved dashboard overview and responsive visual hierarchy.
- Navigation panel finder and scroll controls so every menu item can be reached on desktop and mobile.
- Global search for contacts, projects, tasks and active private notes.
- Persistent Task Planner backed by MongoDB, with priorities, due dates, status and export features.
- Private Notes backed by MongoDB, with edit/save, search, tags, pin, archive/restore, Markdown export and deletion.
- Backup coverage for tasks and private notes.
- Hardening of one-time authenticator code use.

## Safe merge
1. Back up the current working repository or commit it first.
2. Extract this ZIP into the **existing repository root** and preserve folder paths.
3. Allow overwriting matching paths. Do not delete any file that is not in this patch; absent files are unchanged files, not files to remove.
4. Keep current MongoDB/Vercel secrets and database settings. The features in this patch do not introduce a required environment variable or database migration.
5. Run `npm run typecheck`, `npm test`, `npm run lint`, and `npm run build`.
6. Push to the existing GitHub repository and check the Vercel build logs. Run the manual tests in `INCREMENTAL-UPDATE-GUIDE.md` and `NAVIGATION-ACCESSIBILITY-UPDATE.md`.

## Verification status
Source-level syntax transpilation and ZIP integrity checks are performed for this package. Dependency installation timed out in this environment, so the full TypeScript check, full test suite, lint and production build were not completed here. Do not treat deployment as verified until those commands pass in your project environment.
