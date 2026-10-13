# Incremental update — Task Planner + security hardening

## This ZIP is not the complete app
Only new and modified files are included. Do not delete or replace any other project files.

## Safe merge
1. Download and unzip this patch.
2. Copy its files into the existing repository root, keeping the folder paths as shown. Allow overwriting only when a file with the same path exists.
3. Review `README.md`, `UPDATES.md`, and this guide. `.env.example` is a template only; it is not your live configuration.
4. Run `npm install` only if your lockfile/dependencies require it, then run `npm run typecheck`, `npm test`, `npm run lint`, and `npm run build` locally.
5. Commit and push the updates to the same GitHub repository connected to your existing Vercel project. Confirm the Vercel Root Directory still contains the same `package.json`.
6. Check the deployment logs and test existing login, authenticator login, contacts, projects, rates, links, shared databases, export/import, reports and security screens. Then create a small test task, edit it, mark it complete, reopen it, and delete it.

## Data and configuration
- No MongoDB migration is required. MongoDB creates the `tasks` collection the first time you save a task.
- No new environment variables are required for the Task Planner.
- Keep `MONGODB_URI`, `MONGODB_DB` (if set), `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `ADMIN_SESSION_SECRET` unchanged unless you intentionally want to change the existing deployment configuration.
- Do not add secrets to `NEXT_PUBLIC_*` variables, commit `.env.local`, or share your authenticator key.
- The TOTP fix makes the code's single-use claim atomic for requests that reach the same MongoDB database. Do not treat it as a substitute for testing your deployment and maintaining a recovery method.

## Included paths
The ZIP preserves directory paths and contains only new/modified files, not the full repository.
