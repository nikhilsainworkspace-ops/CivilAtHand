# Civil At Hand — incremental update and launch guide

## Important: this is not the entire project
The ZIP contains only files that are new or updated relative to the original uploaded project. Keep all other project files. Do not delete files just because they are not listed in the patch.

## Safe merge
1. Make a backup of your repository or create a Git commit before applying the patch.
2. Download and unzip this patch.
3. Copy its contents into your current repository root, preserving directory paths. Allow overwrite only for matching files.
4. Review `PATCH-MANIFEST.md`, `NAVIGATION-ACCESSIBILITY-UPDATE.md`, `README.md`, and `UPDATES.md`.
5. Keep the existing Vercel variables and MongoDB configuration; do not replace secrets with the placeholder values in `.env.example`.
6. From the project root, run:

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

7. Fix any reported errors before pushing. Push to the same GitHub repository connected to Vercel and verify the production deployment logs.

## Verify the portal after deployment

### Navigation and visual layout
- On a short desktop screen, scroll the sidebar and confirm every panel including Security and Settings can be opened.
- Test `Find a panel` using `notes`, `rate`, `report`, and a query with no matches.
- On a phone, swipe the horizontal navigation strip and use its beginning/end arrow controls.
- Check that the active panel comes into view and that the existing dark sidebar/blue active state remains consistent.

### Sign-in and security
- Keep an existing trusted session open until you have confirmed the authenticator works.
- Test both normal credentials and the current six-digit code in a private window.
- Confirm the authenticator setup secret is stored only in the server environment variable `ADMIN_TOTP_SECRET`, never under a `NEXT_PUBLIC_` name.
- Check automatic lock, signed-in sessions and the activity log. Keep a safe recovery path for the authenticator.

### Contacts and projects
- Create and edit a test contact; search it; check duplicate warnings, filters, multi-select/bulk actions, import/export and CSV/XLSX as available in the original project.
- Create and edit a test project/lead, change its status, and check links to contacts.

### Follow-ups and Task Planner
- Add a test task with a due date, priority and description; edit it, complete it, reopen it if supported, search it and delete it.
- Confirm overdue counts only include tasks that are not complete or cancelled.
- Confirm the task remains after a refresh.

### Private Notes
- Create a note, add tags, save, refresh, edit and save it again.
- Test search, pin/unpin, archive/restore, Markdown export, clipboard copy and confirmed permanent deletion.
- Confirm note contents are not written to the activity-log messages. Do not store passwords, authenticator keys, API secrets or payment-card data in notes.

### Other panels and records
- Check Rate Book, Shared Databases, Reports, Public Form Links, Security and Settings one by one.
- Test a share link in a signed-out/private window; it must open only the public form or specifically shared content, never the admin dashboard or private notes.
- Use a full JSON backup and verify it includes the new task and private notes data. Backups contain sensitive content and must be stored securely; the current patch does not supply a separate one-click restore screen.
- In Settings, use Test connection and confirm the expected MongoDB database status.

## Data and configuration
- No new environment variables or database migration are needed for Tasks, Private Notes or the navigation enhancements.
- MongoDB creates the `tasks` and `privatenotes` collections when the application first writes data.
- Keep `MONGODB_URI`, optional `MONGODB_DB`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, and your existing TOTP secret configured as intended. Keep server secrets out of source control and away from `NEXT_PUBLIC_*` variables.
- Back up sensitive data before replacing a production deployment and test with dummy records first.

## Existing feature preservation
The sidebar retains Overview, Follow-ups, Task Planner, Private Notes, Contact Database, Projects & Leads, Rate Book, Shared Databases, Reports, Public Form Links, Security and Settings. The navigation finder filters only those labels; it does not change records. The new menu scroll controls change only the visible scroll position.

## Verification note
Syntax checks and ZIP integrity can be run without installing the project dependencies. A complete production readiness claim requires the four commands above to pass and a successful Vercel deployment. In this generation environment the package install timed out, so do not skip the project-side verification.
