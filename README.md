# Civil At Hand

A private management system for a personal civil engineering business. Keep manpower suppliers, workers, contractors, subcontractors, vendors, material suppliers, clients, investors, business partners and other construction contacts in one MongoDB database, track projects and leads, never miss a follow-up, and collect details from people through bilingual (Hindi + English) public form links.

Built with Next.js (App Router), MongoDB (Mongoose) and Vercel. One admin, no public sign-up.

## What you can do

| Area | Features |
|---|---|
| **Contacts** | 10 civil categories with their own fields, add / edit / delete, search, filter by category and status, tags, notes, status, follow-up date |
| **Duplicate detection** | Same phone (last 10 digits, so `+91 98765 43210` = `098765-43210`) or same email is caught when you add/edit a contact (you can still save anyway), flagged with a **Duplicate?** badge, and listed with the **Duplicates** filter. Import skips duplicates. |
| **Follow-ups** | One list of everything overdue, due today, next 7 days and later, for contacts and projects. Call, WhatsApp, **Done**, **Tomorrow**, **+1 week**. A red counter shows on the menu. (In-app reminders only; nothing is emailed or pushed.) |
| **Projects & leads** | Lead → Quoted → Negotiation → Ongoing → Completed / On hold / Lost. Client, location, work type, estimated value (₹), dates, lead source, notes, linked contacts (suppliers, subcontractors, workers…), quick stage change, Excel/CSV export |
| **Public forms** | Create a link per category, share by WhatsApp, optional expiry, pause / reactivate / delete. Labels are bilingual (`Name / नाम`). People see only their own form, never your data. |
| **Import / export** | Import CSV or `.xlsx` (4 MB, 1,000 rows, bad rows reported). Export contacts (all, or the current filter) and projects as `.xlsx` or `.csv`. |
| **Share / print** | WhatsApp and email (`mailto:`) a contact; **Save PDF** (browser print) on contacts, follow-ups, projects and reports. |
| **Reports** | Contacts by category / status / state / source, new contacts per month, project pipeline by stage with ₹ value, overdue follow-ups, busiest form links. |
| **Branding** | Name, tagline, colour, logo, favicon and domain come from environment variables. |

## Environment variables (add these in Vercel)

Vercel → your project → **Settings → Environment Variables**. Add them for **Production** (and Preview if you use it), then **Redeploy**.

| Variable | Required | What to put |
|---|:--:|---|
| `MONGODB_URI` | **Yes** | MongoDB Atlas connection string |
| `ADMIN_USERNAME` | **Yes** | Your admin username |
| `ADMIN_PASSWORD` | **Yes** | A long, unique password (not stored in the database) |
| `ADMIN_SESSION_SECRET` | **Yes** | Random text, **32+ characters** (`openssl rand -hex 32`) |
| `MONGODB_DB` | Only if you already use it | Database name. If you never set it, leave it out; the app uses the database named in `MONGODB_URI`. **Do not change it on an existing site**, or your records will seem to vanish. |
| `NEXT_PUBLIC_SITE_URL` | Recommended | `https://your-domain.com` (no trailing slash). Public form links are built from it. |
| `NEXT_PUBLIC_APP_NAME` | No | Business name (default `Civil At Hand`) |
| `NEXT_PUBLIC_APP_TAGLINE` | No | Short tagline |
| `NEXT_PUBLIC_BRAND_COLOR` | No | Hex colour, e.g. `#176b59` |
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
3. **Follow-ups** shows who to contact today. **Projects & leads** tracks work from enquiry to completion. **Reports** summarises everything.
4. Back up: use **Export** now and then, and enable backups in MongoDB Atlas.

Spreadsheet import needs `Name`, `Category` and a phone number or email. The easiest template is an export from this app.

## Security

- Admin login is checked on the server for every private API route; the session is a signed, HTTP-only, SameSite=Strict cookie (Secure in production), valid 7 days. Signing out removes the cookie from your browser (the cookie is stateless, so change `ADMIN_SESSION_SECRET` to sign out all devices).
- Failed logins are throttled (8 tries, then 15 minutes), tracked in MongoDB.
- Public links are bearer links with 192-bit random tokens: anyone who has the link can submit that one form until you pause, expire or delete it. They cannot read any data.
- Public forms include a honeypot against simple bots. There is no CAPTCHA or per-IP rate limit; pause a link if it is abused.
- CSV export neutralises spreadsheet formulas. Security headers (HSTS, nosniff, frame deny) are set in `next.config.ts`.
- The site is set to `noindex`; search engines are told not to list it.

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
app/api/auth|contacts|projects|links|public|export|import|health   server routes (all admin routes call isAdmin())
app/join/[token]/        public form page
components/              dashboard, follow-ups, projects, reports, public form
lib/                     auth, brand, db, categories (form fields), duplicates, followups, projects, reports, csv, validation
models/                  Contact, Project, ShareLink, LoginAttempt (Mongoose)
tests/logic.test.ts      unit tests
public/                  logo, icons, favicon
```

## Known limits

- Reminders are shown inside the app; there are no email/SMS/push notifications.
- One admin user. Up to 5,000 contacts are loaded into the dashboard at once; reports use the loaded records.
- `.xls` (old Excel) is not imported; save as `.xlsx` or CSV.
- Not an accounting, payroll or contract system.
