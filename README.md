# Civil At Hand

A private, personal CRM for a civil engineering / construction network. Manage manpower suppliers, material and equipment vendors, subcontractors, contractors, project liaisoning, investors and execution partners, business development opportunities, financial resources, joint ventures, and clients — without bringing in unrelated social-media features.

This repository is designed to be imported into a **new GitHub repository and deployed on Vercel**. It uses Next.js App Router, MongoDB Atlas, environment-variable admin authentication, and public intake forms that use long random links. No sample admin password is shipped in the project.

## What is included

- **Locked admin dashboard:** the home page opens the sign-in screen. The username and password come from server-only environment variables.
- **MongoDB contact database:** add, view, search, edit and delete records; filter by category or relationship status; save tags, notes, contact details and follow-up dates.
- **Civil-specific intake forms:** distinct fields for manpower suppliers, vendors/material suppliers, subcontractors, contractors, liaisoning/outsourcing, investors/execution partners, business development, financial resources, joint ventures/strategic partnerships and clients.
- **Public bilingual forms:** people can open a generated link without an account. Field prompts use English and Hindi (for example, `Name / नाम`). A successful submission is saved to MongoDB and appears in the admin database.
- **Private-by-token links:** each link uses a 192-bit random token. Links can be paused, activated, renamed, set to expire, or deleted. The link opens only its own form; it does not grant dashboard access or show existing records.
- **Export:** download the full database as a formatted XLSX workbook or UTF-8 CSV. Use **Save PDF** / browser **Print → Save as PDF** for a printable contact-list report. Excel export includes the fixed record fields and the union of civil-specific form fields.
- **Share / contact helpers:** copy public form URLs, share a form in WhatsApp, call saved phone numbers, open WhatsApp for a contact, and open an email draft with `mailto:`.
- **Configurable identity:** app name, tagline, canonical URL, colour, logo and favicon are driven by environment variables. Changing the actual domain still requires adding/assigning that domain in Vercel; no source-code changes are needed.
- **Security basics:** HTTP-only signed admin session cookie, constant-time credential comparisons, basic login throttling tracked in MongoDB, server-side access checks on admin APIs, request validation, and a honeypot on public forms.

## Requirements

- Node.js **20.9 or newer** and npm.
- A MongoDB database. MongoDB Atlas is the easiest option for Vercel.
- A Vercel account and a GitHub repository.

## 1. Configure MongoDB Atlas

1. Create a MongoDB Atlas project and a cluster (a free development cluster is enough to start; review current Atlas plan and backup limits).
2. Create a **database user** with a strong password. Do not use your Atlas account password as the application database password.
3. In Atlas **Network Access**, allow connections from your deployment. Vercel serverless functions can use changing outbound IPs; follow MongoDB's and your organisation's security policy. Allowing `0.0.0.0/0` is convenient but broad, so use it only if acceptable for your use case and protect the database user with a strong password and least privilege.
4. Copy the application connection string. URL-encode special characters in the database username/password. The application selects the database named by `MONGODB_DB` if provided.

## 2. Configure environment variables

Copy `.env.example` to `.env.local` for local development. Replace every placeholder; **do not commit `.env.local`**.

| Variable | Required | Purpose |
|---|---:|---|
| `NEXT_PUBLIC_APP_NAME` | No | Display name in the dashboard, browser title and generated favicon. Defaults to `Civil At Hand`. |
| `NEXT_PUBLIC_APP_TAGLINE` | No | Small brand description displayed in the UI. |
| `NEXT_PUBLIC_SITE_URL` | Recommended in production | Canonical URL including `https://`, no trailing slash. Used when showing/building share links. Without it, links use the request's origin. |
| `NEXT_PUBLIC_BRAND_COLOR` | No | Main hex colour such as `#176b59`. |
| `NEXT_PUBLIC_BRAND_LOGO_URL` | No | Public HTTPS image URL or a path under `public/` such as `/brand-logo.png`. Leave blank to use the built-in mark. |
| `NEXT_PUBLIC_FAVICON_URL` | No | Public favicon URL or path under `public/` such as `/favicon.png`. Leave blank to use the built-in generated SVG mark. |
| `ADMIN_USERNAME` | **Yes** | Username for the private admin panel. |
| `ADMIN_PASSWORD` | **Yes** | Strong, unique admin password. It is not stored in MongoDB. |
| `ADMIN_SESSION_SECRET` | **Yes** | Unique random secret, at least 32 characters, used to sign sessions. Never share or commit it. |
| `MONGODB_URI` | **Yes** | MongoDB connection string. Server only. |
| `MONGODB_DB` | No | Database name, default `civil_at_hand`. |

Generate a good session secret with one of these commands:

```bash
# macOS / Linux / Git Bash
openssl rand -hex 32

# Node.js, any OS
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

For local development:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. If login is not configured, the app explains which environment variables are missing. A database connection is needed for successful login, throttling, forms and records.

## 3. Deploy to Vercel

1. Create an empty GitHub repo and upload the extracted files from this ZIP. Make sure `.env.local` is **not** uploaded.
2. In Vercel, choose **Add New → Project** and import the repo.
3. In **Project Settings → Environment Variables**, add the production variables from the table above. Add `MONGODB_URI`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `ADMIN_SESSION_SECRET` as server-side variables. Only the `NEXT_PUBLIC_*` settings are public by design; never put secrets under that prefix.
4. Deploy. Vercel detects Next.js automatically.
5. Open the deployed URL and sign in with the environment-variable credentials.

Whenever you change branding environment variables, redeploy so the updated value is embedded in the frontend and metadata. For a real custom domain, add it under **Vercel → Project → Settings → Domains**, configure the DNS records Vercel provides, then set `NEXT_PUBLIC_SITE_URL` to the canonical `https://your-domain` and redeploy. Environment variables change the name shown in this app and the generated links; they do **not** register a domain or change DNS on their own.

## 4. First use

1. Sign in to the admin panel.
2. Open **Contact database → Add contact** to add a record manually, or open **Public form links → Create link**.
3. Choose the correct civil category, name the link (example: `Manpower supplier registration – North India`), and optionally set an expiry.
4. Copy the generated URL or share it through WhatsApp. People can fill in the form without a password.
5. New submissions appear under **Contact database** with status `New`. Search/filter, update the status, add tags/notes, and set a follow-up date.
6. Download Excel or CSV whenever you need an offline copy. Use Save PDF for a printable report.

### Current form categories

- Manpower Supplier — worker trades, team capacity, availability and supply locations.
- Vendor / Material Supplier — supplier type, material/product details, brands, supply capacity, GSTIN and delivery locations.
- Subcontractor — work speciality, team capacity, project types, equipment and certifications.
- Contractor — contractor type, speciality, team capacity, project size and licence/registration details.
- Project Liaisoning & Outsourcing — type of support, sectors, regions, relevant experience and engagement model.
- Investors & Execution Partners — role, investment range, project interests and regions.
- Business Development — opportunity type, target clients, sectors, regions and experience.
- Financial Resources Network — working capital/project finance support, amount range, terms and regions.
- Joint Venture & Strategic Partnership — contribution, desired partner, project types, arrangement and regions.
- Client Network — client type, project requirement, expected start, budget and procurement needs.

The bilingual field labels aim to be easier to complete on a phone. The saved record remains private to the admin; the public page does not display a directory.

## 5. Data model and future changes

- `Contact` documents store the standard fields (name, phone, email, company, city, state, status, tags, notes, follow-up date, source) plus a `details` object for category-specific fields. This flexible `details` object lets related civil-work fields grow without making every contact record use identical columns.
- `ShareLink` documents store the category, display title, random token, active state, optional expiry and submission count.
- `LoginAttempt` documents track hashed client keys and temporarily throttle repeated failed sign-in attempts.
- New categories and their bilingual fields live in `lib/categories.ts`. Add a category definition there and it becomes available in the admin contact editor, link generator, public form, and export field union. Keep additions related to civil engineering, construction, project execution, suppliers, manpower, commercial partnerships or clients.
- Brand values are in environment variables, not fixed in the UI components. A new logo can be hosted at a public HTTPS URL and configured with `NEXT_PUBLIC_BRAND_LOGO_URL`; the favicon can be supplied through `NEXT_PUBLIC_FAVICON_URL`.

## Security and privacy notes

- The dashboard/API does not offer public sign-up. Admin credentials must be configured by the owner.
- The admin cookie is HTTP-only, SameSite Strict, signed, and uses the Secure attribute in production. The session expires after seven days; signing out clears it.
- Admin API routes verify the session server-side. Public endpoints are restricted to a valid active token and only return that form's definition.
- Public links are bearer links: anyone who receives a link can submit to that form until it expires, is paused, or is deleted. Share them only with intended recipients.
- Login throttling is backed by MongoDB. Public forms include a simple honeypot, but this is not a replacement for a dedicated WAF/CAPTCHA or provider-level rate limiting if the app becomes high traffic.
- Back up MongoDB Atlas. Exports are useful snapshots but do not replace automated database backups.
- `mailto:` opens the user's configured email app; it does not send email from the server. WhatsApp actions open the WhatsApp share/contact URL. Automatic outbound email would require adding a provider and its server-side credentials.
- This is a focused personal CRM starter, not an accounting, payroll, contract-signing or regulated finance platform.

## Troubleshooting

**Login says it is not configured** — check `ADMIN_USERNAME`, `ADMIN_PASSWORD` and that `ADMIN_SESSION_SECRET` is at least 32 characters long, then redeploy/restart.

**Login cannot reach MongoDB** — verify `MONGODB_URI`, the database user, escaped special characters in its password, Atlas Network Access, and `MONGODB_DB`.

**Share URL uses the wrong domain** — set `NEXT_PUBLIC_SITE_URL` to the canonical URL including `https://`, with no trailing slash; redeploy and create or re-copy the links. Add/attach the domain separately in Vercel.

**A form does not open** — confirm the token link has not expired, been paused or deleted. Reactivate a paused link or create a replacement.

**Logo / favicon is not updated** — ensure the image URL is publicly reachable over HTTPS, update the relevant environment variable and redeploy. Clear the browser favicon cache if needed.

## Project files

```text
app/
  api/auth/                 Admin login, session and logout
  api/contacts/             Protected contact CRUD API
  api/links/                Protected public-link management API
  api/public/[token]/       Public form loading and submission
  api/export/               Full XLSX and CSV database export
  api/health/               Protected MongoDB health check
  join/[token]/             Public intake form page
  icon.svg/                 Generated favicon route
  globals.css               Responsive admin and public-form UI
components/
  dashboard.tsx             Responsive private admin workspace
  public-intake-form.tsx    Bilingual public intake form
lib/
  auth.ts                   Signed session and cookie helpers
  brand.ts                  Environment-driven brand configuration
  categories.ts              Civil-specific field schemas and labels
  contact-input.ts           Input validation and record normalisation
  db.ts                     Cached MongoDB connection
models/
  Contact.ts
  ShareLink.ts
  LoginAttempt.ts
.env.example
AGENTS.md                   Instructions/context for coding agents
README.md
```

## Licence

Private-use starter for your own business workflow. Review dependency licences before redistributing the project.
