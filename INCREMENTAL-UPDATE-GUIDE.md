# Incremental update — Dashboard UI refresh, global search, Task Planner, Private Notes + security hardening

## This ZIP is not the complete app
Only new and modified files are included. Do not delete or replace any other project files. The README in this patch preserves the existing portal documentation and adds a detailed operating manual plus the dashboard redesign guide.

## Safe merge
1. Download and unzip this patch.
2. Copy its files into the existing repository root, keeping the folder paths as shown. Allow overwriting only when a file with the same path exists.
3. Review `README.md`, `UPDATES.md`, and this guide. `.env.example` is a template only; it is not your live configuration.
4. Run `npm install` only if your lockfile/dependencies require it, then run `npm run typecheck`, `npm test`, `npm run lint`, and `npm run build` locally.
5. Commit and push the updates to the same GitHub repository connected to your existing Vercel project. Confirm the Vercel Root Directory still contains the same `package.json`.
6. Check the deployment logs and test existing login, authenticator login, contacts, projects, rates, links, shared databases, export/import, reports and security screens. Then create a small test task, edit it, mark it complete, reopen it, and delete it. Test Private Notes by creating a note with a tag, refreshing, editing, pinning, archiving, restoring, exporting Markdown, and deleting the test note. Finally test global search with one known contact, project, task and private-note title. Verify that contact/project results open their edit forms and task/note results open the corresponding editor.

## Dashboard UI refresh
- The update changes the dashboard visual layout and global search in `components/dashboard.tsx` and `app/globals.css`; it does not delete existing modules or API actions.
- The default brand accent in `lib/brand.ts` changes to blue `#1769e8`. An explicit Vercel `NEXT_PUBLIC_BRAND_COLOR` continues to override the default.
- The global search reads data already loaded into the authenticated dashboard. It does not create a new endpoint or expose results to public users.
- Existing overview content (network categories, updated contacts, follow-up reminders, projects and work-queue summaries) is still available after the new task/notes overview cards.

## Data and configuration
- No MongoDB migration is required. MongoDB creates the `tasks` and `privatenotes` collections on their first write.
- No new environment variables are required for the Task Planner or Private Notes.
- Keep `MONGODB_URI`, `MONGODB_DB` (if set), `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `ADMIN_SESSION_SECRET` unchanged unless you intentionally want to change the existing deployment configuration.
- Do not add secrets to `NEXT_PUBLIC_*` variables, commit `.env.local`, or share your authenticator key.
- The TOTP fix makes the code's single-use claim atomic for requests that reach the same MongoDB database. Do not treat it as a substitute for testing your deployment and maintaining a recovery method.

## Private Notes behavior
- Notes are in a separate MongoDB collection from each contact's `notes` field. Create/edit requires pressing Save; autosave is not enabled.
- Every note route checks the existing admin session. Responses are marked no-store. Notes are not included in public forms or shared-database views.
- The panel supports title/body/tag search, pinning, archiving/restoring, clipboard copy, Markdown export and confirmed permanent deletion.
- Full JSON backup now includes `tasks` and `privateNotes`. This means the file includes sensitive note bodies; store it securely. No one-click restore screen is supplied.
- The application does not separately encrypt note bodies. Do not save passwords, authenticator keys, API secrets or payment-card details in notes.

## Included paths
The ZIP preserves directory paths and contains only new/modified files, not the full repository. It includes the prior incremental Task Planner/Private Notes/security patch together with the refreshed UI files. Merge over your existing repo; do not delete files that are not in this ZIP.

## Validation status for this update
The modified TypeScript/TSX files were syntax-transpiled with the globally available TypeScript compiler and reported no parse errors, and the ZIP archive integrity was checked. Installing the project dependencies timed out in the build environment, so a complete `npm run typecheck`, `npm test`, `npm run lint` and `npm run build` was not completed here. Run those checks after merging and do not treat the deployment as production-ready until they pass and the Vercel build logs are clean.
