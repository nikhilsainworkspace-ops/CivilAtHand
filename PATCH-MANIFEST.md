# Civil At Hand — UI refresh patch manifest

This is an incremental patch, not the complete repository. Merge the files into the existing repository root and keep all files that are not listed here.

## What's changed in this patch

- The admin interface has been restyled with a navy navigation sidebar, bright-blue selection/actions, a pale workspace canvas, consistent cards, cleaner spacing and responsive layouts.
- The overview uses four actionable metric cards, upcoming tasks, quick actions, a private-note preview, workspace search, recent contacts, network categories, follow-up summary, recent activity, quick stats, and project/work-queue summary.
- Global search covers contacts, projects, tasks and active private notes. Contact/project results open their edit form; task/note results open the relevant editor.
- Every existing app area remains in navigation: Contacts, Follow-ups, Task Planner, Private Notes, Projects & Leads, Rate Book, Shared Databases, Reports, Public Form Links, Security and Settings.
- The blue default accent is `#1769e8`. An explicit `NEXT_PUBLIC_BRAND_COLOR` in Vercel still overrides the default.
- The existing incremental Task Planner, Private Notes, backup and authenticator security updates are included in this patch too, so it can be merged onto the original uploaded project.

## Safe merge

1. Make a backup or commit of your current repository.
2. Extract the ZIP and copy its contents into the existing repository root, keeping paths intact. Allow overwriting same-path files only.
3. Do not remove any existing files just because they are absent from this patch. This patch intentionally excludes unchanged project files.
4. Keep your existing Vercel environment variables and MongoDB connection. No new variable or database migration is required for the UI refresh.
5. Run `npm run typecheck`, `npm test`, `npm run lint`, and `npm run build`. Push to the existing GitHub repository only after review, then test the deployed panel.

## Verification status

The changed TypeScript/TSX source and the project TS/TSX files passed a syntax-transpilation check. The CSS brace delimiters are balanced and the generated ZIP passes integrity testing. A full dependency installation timed out, and an offline install confirmed the required packages are not cached here; as a result, the full typecheck, tests, lint and production build have not been completed in this environment. Run them after merging before treating the deployment as production-ready.
