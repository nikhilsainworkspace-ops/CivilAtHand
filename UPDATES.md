# Civil At Hand — Additive Update

This update builds on the existing project and keeps the current dashboard, private login, MongoDB contacts, category-specific bilingual forms, share links, WhatsApp/email helpers and export features.

## New in this update

1. **CSV / Excel import** from Contact database. Supports `.csv` and `.xlsx`; older `.xls` files should first be saved as `.xlsx`. Maximum 4 MB and 1,000 data rows per upload.
2. **Duplicate protection**: contacts that match an existing phone number or email address are skipped. Duplicates within the same imported file are also skipped.
3. **Filtered export**: XLSX/CSV downloads can follow the current category, status and applied search filters, while the no-filter option still exports the full database.
4. **Row-level validation**: invalid rows are counted, with row numbers and reasons shown after import, so the rest of the valid file can still be imported.
5. **Owner-supplied branding pack**: default transparent logo, square icon, ICO favicon, Apple touch icon and white-background logo variants.
6. **Installable mobile shortcut**: a web app manifest uses your configured brand name, colour and icon so you can add Civil At Hand to your phone home screen; sensitive contact data is not cached offline.
7. **Documentation updates**: README, environment-variable guidance and AI-agent instructions explain the importer and the new brand asset defaults.

## Files added

- `app/api/import/route.ts` — admin-only import endpoint.
- `UPDATES.md` — this summary.
- `app/manifest.ts` — installable web app metadata.
- `public/civil-at-hand-logo.png`
- `public/civil-at-hand-icon.png`
- `public/civil-at-hand-icon-192.png`
- `public/apple-touch-icon.png`
- `public/favicon.ico`
- `public/civil-at-hand-logo-white.jpg`

## Files updated

- `components/dashboard.tsx` — adds an Import control and import feedback, without removing existing actions; exports reflect category/status/search filters.
- `app/globals.css` — adds styles for the import control and improves contrast around the logo on dark backgrounds.
- `app/api/export/route.ts` — adds protected filtered XLSX/CSV downloads; the full-database export still works when no filters are passed.
- `lib/brand.ts` — uses the supplied logo/favicon as the default when no URL is configured.
- `app/layout.tsx` — references the favicon, Apple touch icon and app manifest.
- `.env.example` — clarifies logo and favicon defaults.
- `README.md`, `AGENTS.md`, `public/README.md` — documentation.

## Apply the update

### Recommended: use the complete updated ZIP

Extract `Civil-At-Hand-Enhanced.zip` and push the resulting project files to the repository. Keep your actual `.env.local` out of Git.

### If you have the original project already in GitHub

Unzip `Civil-At-Hand-Update-Files.zip` over the existing repository root, allow the listed files to be replaced, then commit and push. No MongoDB data migration is required: this adds a route and public image assets and does not alter the database schema. Existing records and share links remain in MongoDB.

## Import usage

1. Sign in as admin and open **Contact database**.
2. Select **Import** and choose a `.csv` or `.xlsx` file.
3. Use an export from Civil At Hand as the easiest starting format. At minimum, include `Name`, `Category`, and a phone number or email.
4. Review the counts shown. Duplicate phone/email values are intentionally not imported again. Fix any listed invalid rows in the source sheet and re-import only those corrected rows.

The importer is admin-protected by the same session check as other private APIs; public share links do not grant import access.
