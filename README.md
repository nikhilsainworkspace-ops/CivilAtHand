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
| **Shared databases** | Sell or share a frozen copy of selected contacts or rates through a private link with expiry, passcode, open limit, watermark, download switch, price / paid tracking and an access log. |
| **Rate book** | Material, labour and equipment rates with suppliers, supplier comparison, stale-rate flags, export and sharing. |
| **Security centre** | 2-step verification, signed-in devices, activity log, auto-lock, full backup. |
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
- Payments are recorded by you (no payment gateway). There is no file/photo storage, and no restore-from-backup button (use MongoDB Atlas backups for full restore; CSV import covers contacts).
- One admin user. Up to 5,000 contacts are loaded into the dashboard at once; reports use the loaded records.
- `.xls` (old Excel) is not imported; save as `.xlsx` or CSV.
- Not an accounting, payroll or contract system.
