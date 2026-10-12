# CareerOS AI

Initial foundation for a secure, account-based career workspace. **This milestone does not implement resume generation, job discovery, tracking or AI.** Those are future modules.

## Stack
Next.js 15 App Router, React 19, strict TypeScript, Tailwind CSS 4, Supabase Auth/PostgreSQL/Storage (private bucket), Zod, next-themes, Vitest and GitHub Actions.

## Connect your Supabase project
Project URL: `https://jtitfwzpfbyfsdpxxrbj.supabase.co` (provided by the project owner).

1. Install Node.js 22 and run `npm install`.
2. Copy `.env.example` to `.env.local`. The correct project URL is prefilled. Fill `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` with **your** Supabase publishable key (`sb_publishable_…`). The publishable key is a public configuration value, not an admin key; keep all secret/service-role keys off the frontend and out of Git.
3. Apply `supabase/migrations/202610120001_initial.sql` to the intended development/staging Supabase project. Prefer migration tooling for future changes. **Do not assume the migration was applied simply because it is in GitHub.**
4. In Supabase → Authentication → URL Configuration, set Site URL to `http://localhost:3000` for local testing. Add `http://localhost:3000/auth/callback` and `http://localhost:3000/auth/callback?next=/update-password` to redirect URLs. Configure email verification and an authorized email delivery provider.
5. Set `NEXT_PUBLIC_SITE_URL=http://localhost:3000` and run `npm run dev`. Visit `http://localhost:3000`; test with two distinct test users.

**When deploying:** set the three NEXT_PUBLIC_* environment variables in the host's environment configuration and set the production site/redirect URLs in Supabase Authentication. Do not upload `.env.local` to the public repository.

## Commands
`npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run dev`.

## Security
Private pages require verified Supabase identity server-side; PostgreSQL RLS migration defines owner isolation. Supabase auth cookies are managed by SSR middleware. The private storage bucket has no client upload policy until scanning exists. The publishable key **does not itself provide RLS or user-data security**.

## Deployment
Deploy to a Next.js-capable platform such as Vercel; configure host environment and exact production Auth redirect URLs. Apply database migrations before release; test registration, verification, password reset, RLS, sessions and data privacy flows in staging first.

## Status and limitations
Source configuration now targets the supplied project URL, but connection to its database is **not yet verified** and the SQL migration is **not yet confirmed applied**. Public launch requires monitoring, email delivery, abuse controls, uploads scanning, account export/deletion, privacy legal review, localization, integration tests, security review and a reproducible lockfile. See docs and FEATURE_STATUS.md.
