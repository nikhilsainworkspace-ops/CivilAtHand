# Civil At Hand

A private management system for a personal civil engineering business. Keep manpower suppliers, workers, contractors, subcontractors, vendors, material suppliers, clients, investors, business partners and other construction contacts in one MongoDB database, track projects and leads, never miss a follow-up, and collect details from people through bilingual (Hindi + English) public form links.

Built with Next.js (App Router), MongoDB (Mongoose) and Vercel. One admin, no public sign-up.

## What you can do

| Area | Features |
|---|---|
| **Contacts** | 10 civil categories with their own fields, add / edit / delete, search, filter by category and status, tags, notes, status, follow-up date |
| **Duplicate detection** | Same phone (last 10 digits, so `+91 98765 43210` = `098765-43210`) or same email is caught when you add/edit a contact (you can still save anyway), flagged with a **Duplicate?** badge, and listed with the **Duplicates** filter. Import skips duplicates. |
| **Follow-ups** | One list of everything overdue, due today, next 7 days and later, for contacts and projects. Call, WhatsApp, **Done**, **Tomorrow**, **+1 week**. A red counter shows on the menu. (In-app reminders only; nothing is emailed or pushed.) |
| **Task planner** | Persistent tasks for site visits, quotations, document collection and operations. Due dates, priority, status, notes, links to a contact or project, overdue-first sorting, search, CSV export and completion tracking. |
| **Private notes** | Admin-only notebook stored in MongoDB: create, edit, search, tag, pin, archive / restore, copy, export to Markdown, and permanently delete notes. Included in the full JSON backup; never exposed on public forms or shared database links. |
| **Projects & leads** | Lead → Quoted → Negotiation → Ongoing → Completed / On hold / Lost. Client, location, work type, estimated value (₹), dates, lead source, notes, linked contacts (suppliers, subcontractors, workers…), quick stage change, Excel/CSV export |
| **Public forms** | Create a link per category, share by WhatsApp, optional expiry, pause / reactivate / delete. Labels are bilingual (`Name / नाम`). People see only their own form, never your data. |
| **Import / export** | Import CSV or `.xlsx` (4 MB, 1,000 rows, bad rows reported). Export contacts (all, or the current filter) and projects as `.xlsx` or `.csv`. |
| **Share / print** | WhatsApp and email (`mailto:`) a contact; **Save PDF** (browser print) on contacts, follow-ups, projects and reports. |
| **Reports** | Contacts by category / status / state / source, new contacts per month, project pipeline by stage with ₹ value, overdue follow-ups, busiest form links. |
| **Shared databases** | Sell or share a frozen copy of selected contacts or rates through a private link with expiry, passcode, open limit, watermark, download switch, price / paid tracking and an access log. |
| **Rate book** | Material, labour and equipment rates with suppliers, supplier comparison, stale-rate flags, export and sharing. |
| **Security centre** | 2-step verification, signed-in devices, activity log, auto-lock, full backup. |
| **Branding** | Name, tagline, colour, logo, favicon and domain come from environment variables. |

## Dashboard redesign (October 2026)

The admin workspace now uses a clear navy navigation rail, blue active states, a light page background, card-based summaries, consistent icon colours and responsive layouts. The redesign is visual and organizational: it does not remove any existing modules or data-management actions.

- **Left navigation:** Overview, Follow-ups, Task Planner, Private Notes, Contact Database, Projects & Leads, Rate Book, Shared Databases, Reports, Public Form Links, Security and Settings remain available. Counters still show useful record counts and overdue work where available.
- **Workspace search:** search contacts, projects, tasks and active private notes from the top bar. Contact and project results open their edit forms. Task and note results open the corresponding editor and scroll to it. Search does not make private records public; the whole dashboard remains behind admin login.
- **Four overview metrics:** total tasks (with open/completed split), contacts (new and qualified/active), projects (active/completed), and active private notes (pinned/archived split). Clicking a metric takes you to its panel.
- **Upcoming Tasks:** the overview lists up to six open tasks, ordered by soonest due date and then priority. Overdue tasks get a warning. Use View all / Manage tasks to edit, complete or otherwise manage tasks in the full Task Planner.
- **Quick Actions:** shortcuts to add a task, write a private note, add a contact or add a project. Collect details stays available in the Overview heading and continues to open the public-form link creator.
- **Private Notes preview:** up to four recent, active notes are shown with title, a short text preview, date and a pin marker. View all opens the full notes notebook.
- **Original overview features retained:** Network categories and their category-filter shortcut, recently updated contacts and contact editing, follow-up reminders, open-lead/ongoing-project figures, the work queue, privacy explanation and Workspace Settings link remain available lower on the dashboard.
- **Recent activity and Quick Stats:** a compact list combines recently updated contacts, projects, tasks and notes (note titles/body text are not shown in this activity list); quick counts show completed/open tasks, active projects and active/qualified contacts.
- **Responsive behavior:** the left navigation becomes a horizontally scrollable navigation strip on narrow screens, cards collapse into fewer columns, tables scroll horizontally rather than crushing their columns, and buttons remain touch friendly. Search and admin controls wrap on small screens.

The default brand accent is now blue (`#1769e8`) to match the new design. An explicit `NEXT_PUBLIC_BRAND_COLOR` value in Vercel still takes precedence and remains customizable; edit/remove that variable only if you intentionally want to use the new default blue. The UI update introduces no new environment variables and no database migration.

## Environment variables (add these in Vercel)

Vercel → your project → **Settings → Environment Variables**. Add them for **Production** (and Preview if you use it), then **Redeploy**.

| Variable | Required | What to put |
|---|:--:|---|
| `MONGODB_URI` | **Yes** | MongoDB Atlas connection string |
| `ADMIN_USERNAME` | **Yes** | Your admin username |
| `ADMIN_PASSWORD` | **Yes** | A long, unique password (not stored in the database) |
| `ADMIN_SESSION_SECRET` | **Yes** | Random text, **32+ characters** (`openssl rand -hex 32`) |
| `ADMIN_TOTP_SECRET` | Optional, recommended | Base32 secret generated from Security → Set up 2-step verification. Keep it private; do not use a `NEXT_PUBLIC_` name. |
| `MONGODB_DB` | Only if you already use it | Database name. If you never set it, leave it out; the app uses the database named in `MONGODB_URI`. **Do not change it on an existing site**, or your records will seem to vanish. |
| `NEXT_PUBLIC_SITE_URL` | Recommended | `https://your-domain.com` (no trailing slash). Public form links are built from it. |
| `NEXT_PUBLIC_APP_NAME` | No | Business name (default `Civil At Hand`) |
| `NEXT_PUBLIC_APP_TAGLINE` | No | Short tagline |
| `NEXT_PUBLIC_BRAND_COLOR` | No | Hex colour, e.g. `#1769e8` |
| `NEXT_PUBLIC_BRAND_LOGO_URL` | No | Blank = included logo. Or `/your-logo.png` (file in `public/`) or an `https://` URL |
| `NEXT_PUBLIC_FAVICON_URL` | No | Blank = included favicon |

Only the four required ones matter to get started. Never put secrets in variables starting with `NEXT_PUBLIC_`. See `.env.example`.

## Deploy (new GitHub repository)

1. Unzip the complete project. Make sure the repository **root** contains `package.json`, `app/`, `components/`, `lib/`, `models/`, `public/` (not one extra folder around them).
2. Create an empty GitHub repository and upload everything. `.gitignore` already keeps `.env*` and `node_modules` out. Never upload `.env.local`.
3. In Vercel choose **Add New → Project**, import the repository. **Framework Preset must be Next.js** and **Root Directory** must be the folder that contains `package.json`.
4. Add the environment variables above, then **Deploy**.
5. Open the `…vercel.app` address, sign in, and test with **Settings → Test connection**.
6. Custom domain: Vercel → Settings → Domains, add it and set the DNS records Vercel shows, then set `NEXT_PUBLIC_SITE_URL` and redeploy.

### Updating an existing repository
Unzip the **update ZIP** over your repository root (same folder structure), allow overwrite, commit and push. Vercel redeploys automatically. No data migration is needed: existing contacts, links and public form URLs keep working. Projects are a new collection that MongoDB creates by itself.

## Local development

```bash
npm install
cp .env.example .env.local   # then fill it in
npm run dev                  # http://localhost:3000
npm run typecheck            # TypeScript check
npm test                     # logic tests (duplicates, follow-ups, CSV, validation, reports)
npm run build                # what Vercel runs
```

## Daily use

1. **Contact database → Add contact**, or **Public form links → Create link** and send the link on WhatsApp.
2. New submissions appear as status **New**. Set a **Follow-up date** on anyone you need to call.
3. **Follow-ups** shows who to contact today. **Task planner** tracks standalone actions and links them to contacts/projects. **Private notes** holds internal-only writing and reminders. **Projects & leads** tracks work from enquiry to completion. **Reports** summarises everything.
4. Back up: use **Export** now and then, and enable backups in MongoDB Atlas.

Spreadsheet import needs `Name`, `Category` and a phone number or email. The easiest template is an export from this app.

## Shared databases (sell or share data with a client)

**Shared databases** turns any list of your records into a private, time-limited link for a client or company.

1. Pick the records: tick contacts in the Contact database and press **Share selected…**, or open **Shared databases → Share a database** and filter by category, state, status or (for the Rate book) type and place.
2. Choose which fields they may see. Your **private notes, tags, status, ratings, follow-ups and history are never shared**, enforced on the server. *Preview mode* hides most of every phone number and email, handy as a free sample before payment.
3. Set the rules: **expiry** (required: 1 hour to 1 year, or a date and time), a **passcode** (auto-generated, shown once), an optional **open limit**, **watermark** with the client's name, and whether they may **download Excel/CSV**.
4. Record the money: price, Free / Unpaid / Paid, and optionally **keep the link locked until you mark it Paid**.
5. Send the ready-made message by WhatsApp or copy it.

What happens next: the client opens `/shared/<secret>`, types the passcode and sees a searchable table. You can **pause, extend, reset the passcode, change the open limit, mark paid or delete** at any time, and see an **access log** (opens, downloads, wrong passcodes, masked IP and browser).

Things worth knowing:
- The link holds a **frozen copy** taken when you created it. Later edits or deletions in your contacts do not change what the client got (so you can prove what was sold). Create a new link for fresh data.
- 5 wrong passcodes lock that link for 15 minutes. Reloading from the same device within 15 minutes does not use up another "open".
- Honest limit: anyone who can *see* data can copy it. Expiry, passcodes, watermarks, logs and a written agreement make misuse costly and traceable; they cannot make copying impossible. Downloads of watermarked files carry the client's name and a reference code.
- **Consent:** contacts are shared only if you recorded **"May this contact be shared with clients? Yes"** (the public form now has an optional checkbox for this). A contact marked **No** is never shared. You can override "not recorded" per share, but check the rules that apply to you (for example India's DPDP Act) before selling personal data. This is not legal advice.

## Rate book

Save material, labour, equipment and sub-contract rates with unit, supplier (link to a contact), place and validity date. **Compare suppliers** shows the cheapest quote and how much you save. Rates untouched for 90 days are flagged *Old*. Export or share the list as a shared database.

## Other tools

- **Bulk actions:** tick contacts, then set status, add a tag, mark sharing consent, flag Preferred/Avoid, share, or delete.
- **Merge duplicates:** Duplicates filter → *Merge duplicates…*. Missing details, tags, notes and history are copied into the record you keep; projects and rates that pointed at the others are re-pointed.
- **History per contact:** log calls, WhatsApp, meetings and site visits; "last contacted" is tracked. Plus a 1-5 star **rating** and a **Preferred / Avoid** flag.
- **Project money:** billed and received per project, *To collect* tile and report.
- **Task planner:** add operational tasks with priority, due date, notes and a related contact/project. Overdue tasks rise to the top; mark tasks complete or reopen them.
- **Private notes:** store your own internal notes in the `PrivateNote` MongoDB collection. Notes have a title, body, comma-separated tags, pin and archive states; they can be edited, copied, searched, exported as Markdown, restored from archive or permanently deleted. Only the signed-in admin API can read or change them.
- **Import template:** a blank Excel file with the right columns. **Full backup** (JSON) in Security.
- **Hide numbers** button blurs phone numbers and emails while someone looks at your screen.

## Security

This is a private, single-admin portal. Nobody can register; the only outsiders who ever see anything are people holding a link you created.

- **Server-checked sessions.** Signing in creates a session record in MongoDB (only a hash of its id). Sign-out really ends it, idle sessions expire (`ADMIN_IDLE_MINUTES`, default 12 h), sessions last at most `ADMIN_SESSION_HOURS` (default 7 days). **Security → Signed-in devices** lists them and can sign out any or all others. The cookie is HTTP-only, SameSite=Strict, `__Host-` prefixed and Secure in production. The browser also locks itself after 5-60 idle minutes (your choice).
- **2-step verification (optional, recommended).** Security → *Set up 2-step verification* gives you a key for Google/Microsoft Authenticator or Authy; paste it into `ADMIN_TOTP_SECRET` and redeploy. Codes are single-use. If the variable is set but malformed, sign-in is refused rather than silently skipping 2FA. Lost your phone? Delete the variable in Vercel.
- **Cross-site request blocking:** admin APIs reject requests the browser marks cross-site, on top of SameSite cookies.
- **Throttling:** failed logins (8 tries, then 15 minutes); public form submissions (20 per hour per device); client link requests; passcode attempts per link.
- **Activity log:** sign-ins (and failures), deletions, bulk changes, merges, imports, exports, backups and every shared-link change are recorded for 180 days. No secrets are stored in it.
- **Client links:** 192-bit random tokens, `noindex`, no-store, no referrer; passcodes are stored only as scrypt hashes; the client page can read only its own frozen copy.
- **Headers:** Content-Security-Policy, HSTS, nosniff, frame deny and COOP are set in `next.config.ts`. CSV export neutralises spreadsheet formulas. The site is `noindex`.
- **Your part:** use a long unique password, turn on 2-step verification, keep Atlas network access and your Vercel account protected (2FA there too), and download a backup after big changes.

## Troubleshooting

| Problem | Fix |
|---|---|
| Site opens a 404 / blank page with a "successful" deploy | Framework Preset must be **Next.js**; Root Directory must contain `package.json` |
| Login says not configured | Check the three admin variables; secret must be 32+ characters; redeploy |
| Cannot reach MongoDB | Check `MONGODB_URI`, database user/password (special characters URL-encoded), Atlas **Network Access** (allow Vercel, e.g. `0.0.0.0/0`) |
| Records look empty after an update | `MONGODB_DB` / URI database name changed. Restore the previous value |
| Public link says unavailable | Link is paused, expired, deleted, or copied incompletely |
| Wrong domain in shared links | Set `NEXT_PUBLIC_SITE_URL`, redeploy, copy the link again |
| Logo not updating | Check the URL is public HTTPS or a file in `public/`; redeploy; clear the browser favicon cache |
| Import skips rows | Rows with a duplicate phone/email are skipped on purpose; invalid rows are listed with the reason |

## Project layout

```text
app/api/auth|contacts|projects|tasks|notes|links|public|export|import|health   server routes (admin routes call isAdmin())
app/join/[token]/        public form page
components/              dashboard, follow-ups, task planner, projects, reports, public form
lib/                     auth, brand, db, categories (form fields), duplicates, followups, projects, reports, csv, validation
models/                  Contact, Project, Task, PrivateNote, ShareLink, LoginAttempt (Mongoose)
tests/logic.test.ts      unit tests
public/                  logo, icons, favicon
```

## Known limits

- Follow-ups and tasks are shown inside the app; there are no email/SMS/push notifications or scheduled background jobs.
- Payments are recorded by you (no payment gateway). There is no file/photo storage, and no restore-from-backup button (use MongoDB Atlas backups for full restore; CSV import covers contacts).
- One admin user. Up to 5,000 contacts are loaded into the dashboard at once; reports use the loaded records.
- `.xls` (old Excel) is not imported; save as `.xlsx` or CSV.
- Not an accounting, payroll or contract system.


## Detailed portal manual — what each area does and how to use it

This section describes the screens already in the portal plus the incremental Task Planner and Private Notes additions. The system is designed as a single-admin workspace. It does not create public admin accounts. Normal records are stored in your configured MongoDB database and protected API routes require a valid admin session. Public form and shared-database links are deliberately separate from your private dashboard.

### 1. Sign-in and dashboard overview

- Open the site's home page. The login form uses the configured admin username and password; when `ADMIN_TOTP_SECRET` is enabled it also asks for a current six-digit authenticator code.
- The dashboard opens only after server-side session verification. The session cookie is HTTP-only and signed; sessions can expire, be revoked, and be reviewed in Security.
- **Overview** shows a high-level view of the contact network, new enquiries, active relationships and active form links. Use the category rows to jump into a contact category. The work-queue card opens the Task Planner.
- **Hide numbers** blurs phone numbers and email addresses in the current browser view when another person is nearby. This is a visual privacy aid, not a substitute for signing out or locking the device.

### 2. Contact database

- **Create:** use Add contact, choose the relevant civil-work category, and fill the fields for that type. A phone number or email is required. You can also store city, state, company, status, follow-up date, tags, sharing-consent status and category-specific details.
- **Edit:** use the pencil action on a row. Editing keeps the record's original source information. Use the status field to distinguish new, contacted, qualified, active, on-hold and closed relationships.
- **Search and filters:** search name, phone, email, organisation, place and related details. Filter by category and status. The Duplicates action finds likely repeat records.
- **Duplicate safety:** add/edit checks matching phone numbers (normalised to the last 10 digits) and email addresses. You can explicitly confirm saving a possible duplicate, but avoid doing so unless they are truly different people/records. Import skips known duplicates.
- **Bulk actions:** select rows to update status, add tags, set sharing consent, mark Preferred/Avoid, share selected records or delete. Check the selection carefully before any bulk delete.
- **Contact actions:** call via the telephone link, message on WhatsApp, share a contact summary, email a contact summary, or open the contact's history. The star rating and Preferred/Avoid flag help prioritise trusted suppliers or contacts to avoid.
- **History:** log calls, WhatsApp messages, meetings, emails, site visits or notes as interaction entries. This makes it easier to see the last contact and what was discussed. The history is private; do not assume it is included in a shared database.
- **Import:** choose a CSV or `.xlsx` workbook that follows the downloadable Template. Review the results and rejected rows; imports are limited to 4 MB and 1,000 data rows per upload. Old `.xls` files must be saved as `.xlsx` or CSV first.
- **Export:** download CSV or Excel for the full contact database or the current filters. The export menu also supports browser print / Save as PDF. Treat exported files as sensitive because they contain contact information.
- **Merge duplicates:** select the records to merge, choose which record to keep, and review the combined information before confirming. The merge tool preserves missing data and updates references where supported.

### 3. Follow-ups

- This screen collects dated follow-ups from contacts and projects and groups them by overdue, today, the next seven days and later. Closed contacts and completed projects are excluded from active reminders.
- Use **Done** to clear a follow-up, **Tomorrow** or **+1 week** to reschedule, and Call or WhatsApp to contact the person. Open the linked contact or project when you need more context.
- The navigation badge indicates follow-ups that need attention. These are in-app reminders only; there is no automatic email, SMS, push notification or background scheduler.

### 4. Task Planner (persistent operational checklist)

- Use a task for a specific action such as arrange a site visit, send a quotation, collect drawings, check a payment, call a contractor or prepare documents. Tasks are different from contact follow-up dates and can be used even when no contact is linked.
- Every task has a title, description/checklist details, priority (Low, Normal, High or Urgent), due date, status (To do, In progress, Done or Cancelled), and optional related contact or project.
- **Save / edit:** fill out the form and click Add task. Use Edit and Save task to change it. The tasks are stored in the MongoDB `Task` collection and remain after refresh or sign-out.
- **Work through tasks:** Mark complete using the check action, reopen a completed task, or use Start to move it into progress. Delete removes it permanently after confirmation.
- **Find work:** tabs filter Open, Overdue, Completed and All tasks. Search finds words in the title/details; the list prioritises open urgent/overdue work. The menu and overview show task counts.
- **Export:** Export CSV downloads the tasks currently shown by the search/filter. It is a local file download; it does not send data to a third party.

### 5. Private Notes (new)

Private Notes is a personal notebook for internal-only information: meeting summaries, site observations, ideas, draft messages, checklists or reminders. It is separate from the existing `notes` field on each contact and project.

- **Create:** open Private notes in the left navigation, write a title, optional body and comma-separated tags, then press **Save note**. The API validates the input and saves it in the MongoDB `PrivateNote` collection. A title is required; the body can be blank.
- **Edit:** choose Edit on a saved note, modify its fields, then click Save changes. The editor explicitly saves on submit; unsaved typing is not automatically persisted.
- **Search:** search matches title, body text and tags. Use Active, Pinned and Archived filters to focus the list. The screen loads up to 1,000 notes.
- **Pin:** pins important notes toward the top of the list. Unpin them when they no longer need attention.
- **Archive / restore:** archiving hides a note from Active and Pinned views without deleting it. Open Archived and choose Restore to bring it back.
- **Copy:** copies the title, body and tags to your clipboard when your browser grants clipboard access.
- **Export Markdown:** downloads the notes currently visible in the selected view as a `.md` file. This is separate from the full database backup. Store exported files securely.
- **Delete:** permanently removes that note from MongoDB after a confirmation prompt. Archiving is the safer choice if you may need the note again.
- **Privacy:** every notes API action checks the existing admin session and responses use no-store headers. Public intake forms and shared database links do not expose private notes. The activity log records note actions without storing note titles or bodies. The notes themselves are stored as normal database content, not separately application-encrypted; use a trusted MongoDB account and TLS, restrict Atlas access, and avoid putting passwords, authenticator setup keys, API credentials or card details in a note.
- **Backup:** the Security full JSON backup now includes `tasks` and `privateNotes` alongside the previous backup sections. Backups include private text, so protect downloaded files. The portal does not provide a one-click restore button.

### 6. Projects & leads

- Create a project or lead when work becomes a distinct opportunity. Store the client, location, type of work, source, estimates, dates, follow-up, notes and linked contacts.
- Move a lead through Lead, Quoted, Negotiation, Ongoing, Completed, On hold or Lost as the deal progresses. Completing or losing a project changes reporting and follow-up behaviour.
- Track estimated value, billed amount and received amount where relevant. The portal derives amounts still to collect for the dashboard/reporting. Monetary values are records you maintain; no payment is taken automatically.
- Export projects to CSV or Excel or use browser print / Save as PDF. Project exports contain business-sensitive information.

### 7. Rate book

- Save item/service, group, specification, unit, rate, supplier, supplier contact, location, validity date and notes. Use it as a reference for materials, labour and equipment.
- Supplier comparison helps compare saved quotes. Rates older than the freshness threshold are flagged so you can request an updated quote.
- Rates can be exported and selected rate data can be included in a Shared Database. Verify the validity date and units before using a rate in a quotation.

### 8. Public form links

- Choose Create link, give it a purpose/name, pick the contact category and optionally set an expiry. Share the generated URL through WhatsApp or any channel.
- The recipient gets a category-specific bilingual form, not access to the dashboard. Public submissions are validated and create new records in the contact database.
- Pause or reactivate a link, rename it, or delete it if it is no longer needed. Expired and paused links stop accepting submissions. Anyone who receives a working URL can open the form, so share links thoughtfully.
- The public form includes a sharing-consent choice where supported. A contact's private fields and activity history do not become public just because they submitted a form.

### 9. Shared databases

- Use this feature when you need to provide a selected, limited dataset to a client or partner. Choose contacts/rates and the columns they may see, then set an expiry and optional rules such as passcode, open limit, watermark and downloads.
- A shared room is a snapshot of data when created. Later edits to the source contact/rate do not automatically change that snapshot. Create a new room if the recipient needs fresh data.
- Configure price and payment status for your own tracking; payment recording does not process a payment. If configured, the room can stay locked until marked paid. You can pause, extend or reset supported link controls and inspect its access log.
- The server filters fields before sharing. Consent is considered by the share flow; review recipients, columns and applicable data protection obligations before sharing personal records. No technical control can stop a recipient from copying information that is visible to them.

### 10. Reports

Reports summarise the data loaded from your database: contacts by category/status/place/source, new contact growth, lead/project pipeline, estimated and ongoing values, overdue follow-ups and activity on form links. Use them to prioritise outreach and review pipeline status, not as a substitute for accounting records. Report figures are based on stored data and may be affected by incomplete entries. Use browser print / Save as PDF when you need a snapshot.

### 11. Security centre

- **Two-step verification:** use the generated Base32 setup key in an authenticator app, verify a current six-digit code, then set the same secret in Vercel as `ADMIN_TOTP_SECRET` and redeploy. The environment variable name must not begin with `NEXT_PUBLIC_`. Do not share the setup key.
- **Signed-in devices:** review sessions and revoke this device or other sessions. Revocation is server-side. After changing security settings, test a fresh private-window login before closing an existing trusted session.
- **Auto-lock:** the browser can sign out after a chosen period of inactivity; the server also enforces its own session idle/expiry rules. Browser auto-lock is a convenience, not the server security boundary.
- **Activity log:** examine recent administrative/security activity. Note event entries intentionally avoid storing private-note bodies.
- **Full backup:** download a JSON backup of contacts, projects, rates, form links (without their tokens), shared-room metadata (sensitive room fields are excluded by the existing backup route), tasks and private notes. Protect this file; it is a copy of sensitive business data. There is no restore-from-backup button in the dashboard. Use MongoDB Atlas backup tooling for robust disaster recovery.

### 12. Workspace settings and deployment

- Settings displays branding/database health information relevant to the existing deployment. Branding values such as app name, tagline, brand colour and logo URL are controlled by the documented environment variables.
- Keep `MONGODB_URI`, the optional `MONGODB_DB`, admin credentials and `ADMIN_SESSION_SECRET` the same when updating the app. Changing `MONGODB_DB` can make a valid deployment appear to have lost all records because it is looking at another database.
- This update adds no new environment variable and no migration step. MongoDB creates the `tasks` and `privatenotes` collections on first write. Deploy by merging the incremental ZIP into the repository root, running the checks below, committing and pushing to the existing Vercel project, then testing the deployment logs and core flows.

### Suggested post-deployment smoke test

1. Sign in with the current admin password and authenticator code.
2. Open Contacts, edit a harmless test record and confirm its values remain. Do not delete real data for testing.
3. Create a test task; edit it, mark it complete, reopen it and delete the test task.
4. Create a private note titled `Test note`, add a tag, save, refresh, edit, pin it, archive it, restore it, export Markdown, and finally delete the test note.
5. Check that the note is present in the full JSON backup after test creation (protect the downloaded file), and that public forms/shared database links do not display private notes.
6. Confirm the existing public link, project, rate book, reports and security screens still work before considering deployment complete.

A successful source merge is not the same thing as a verified production build. Run `npm run typecheck`, `npm test`, `npm run lint` and `npm run build` with dependencies installed, and review Vercel's deployment logs before treating the release as production-ready.
