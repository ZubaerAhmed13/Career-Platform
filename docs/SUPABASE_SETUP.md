# CareerOS AI — Supabase setup and live verification

## Configured project

Public project URL: `https://jtitfwzpfbyfsdpxxrbj.supabase.co`.

This public URL is already in `.env.example`. The application supports `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Put the full publishable key in a **local untracked** `.env.local` or deployment environment variables, never in source control. You do not need a service-role/secret key for this milestone.

## Prepare the database (requires project-owner access)

1. Sign in to your Supabase Dashboard and select the correct project.
2. Open the SQL Editor (or use Supabase CLI against the intended project).
3. Apply **in order**, once:
   - `supabase/migrations/202610120001_initial.sql`
   - `supabase/migrations/202610120002_restrict_unverified_file_metadata.sql`
4. Check `public.profiles`, `public.file_metadata`, and storage bucket `career-private` exist and all private tables have RLS enabled.
5. Confirm that ordinary users can read/edit **their own** profiles only, and that no browser upload/metadata-insert policy is enabled.

Never apply a migration blindly to production; review it and run staging tests.

## Auth configuration

In Supabase → Authentication → URL Configuration:

- Local Site URL: `http://localhost:3000`
- Redirect allowlist includes:
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/auth/callback?next=/update-password`
- Production: use your actual deployed HTTPS site origin and equivalent callback URLs.
- Configure a production-grade SMTP/email provider before public launch.

The callback accepts authorization `code` or `token_hash` / `type` formats. For token-hash confirmation templates, use your deployed site callback URL with `token_hash={{ .TokenHash }}&type=email`. Recovery templates should use `type=recovery` and `next=/update-password`. Review and test the Auth templates before publication.

## Local app

```bash
cp .env.example .env.local
# fill NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local
npm install
npm run dev
```

Verify register → confirm email → sign in → onboarding → dashboard → settings → logout → sign back in → recover password. Test mobile navigation and saved dark/light theme across devices.

## Live RLS testing in **dedicated staging only**

Prepare two disposable email-confirmed user accounts and a staging Supabase project with both migrations applied. Export the following environment variables securely (do not put staging passwords in GitHub repository files):

```text
SUPABASE_TEST_PROJECT_URL=<STAGING_PROJECT_URL>
SUPABASE_TEST_PUBLISHABLE_KEY=<STAGING_PUBLISHABLE_KEY>
SUPABASE_TEST_USER_A_EMAIL=<TEST_ACCOUNT_A_EMAIL>
SUPABASE_TEST_USER_A_PASSWORD=<TEST_ACCOUNT_A_PASSWORD>
SUPABASE_TEST_USER_B_EMAIL=<TEST_ACCOUNT_B_EMAIL>
SUPABASE_TEST_USER_B_PASSWORD=<TEST_ACCOUNT_B_PASSWORD>
SUPABASE_TEST_ALLOW_MUTATIONS=I_UNDERSTAND_STAGING_ONLY
```

Run `npm run test:integration`. It fails explicitly if test configuration is missing. It verifies owner reads/writes, blocked cross-account reads/writes, anonymous isolation, rejection of fabricated document metadata and restores the temporary owner-profile change.

The default `npm test` suite is unit-only. GitHub CI uses dummy public configuration to compile; it **does not authenticate against the live database**.

## Deployment and public-launch requirements

Deploy the application to a hosting service supporting Next.js server actions and set its 3 public environment variables. Update Supabase Auth Site URL and redirect allowlist for that HTTPS domain; apply migration and recheck authorization in staging. Before public launch, complete rate limiting, email deliverability, privacy notices, data export/deletion, document scanning, live integration/E2E tests, monitoring, dependency security review, localization review and a GDPR legal/privacy assessment.

**Current connection status:** Supabase provider management access is not connected in this ChatGPT environment; the source repository alone does not execute SQL on the hosted database.

## Milestone 2 additional migrations
After 001 and 002, review and apply in ascending order:
- `supabase/migrations/202610120003_career_vault.sql`
- `supabase/migrations/202610120004_career_suggestion_review.sql`
- `supabase/migrations/202610120005_suggestion_conflicts.sql`

Before applying, confirm the target project, staging/production environment, migration history, backups, and table names. The publishable key is not permission to run SQL. Use an authorized Supabase project connection or the project's SQL Editor. Never assume these migrations have been applied just because their files exist in GitHub.

**Postmigration checks:** inspect RLS on every new private table, verify composite owner constraints, use two separate staging users, run `npm run test:integration` with explicit staging credentials, verify suggestion approval/merge RPC ownership and session privacy, then manually test account persistence and email recovery. Do not use real applicants' records as test data.
