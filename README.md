# CareerOS AI

Initial foundation for a secure, account-based career workspace. **This milestone does not implement resume generation, job discovery, tracking or AI.** Those are future modules.

## Stack
Next.js 15 App Router, React 19, strict TypeScript, Tailwind CSS 4, Supabase Auth/PostgreSQL/Storage (private bucket), Zod, next-themes, Vitest and GitHub Actions.

## Local setup
1. Install Node.js 22 and run `npm install`.
2. Create a Supabase project and copy `.env.example` to `.env.local`. Populate the project URL and the public **anon** key; never commit secrets.
3. Apply `supabase/migrations/202610120001_initial.sql` in your Supabase development project (prefer Supabase CLI migrations for ongoing development).
4. In Supabase Auth set Site URL to `http://localhost:3000` and redirect allowlist to `http://localhost:3000/auth/callback` and `http://localhost:3000/auth/callback?next=/update-password`. Configure email delivery/verification appropriately.
5. Set `NEXT_PUBLIC_SITE_URL=http://localhost:3000`. Run `npm run dev`, then visit localhost:3000.

## Commands
`npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run dev`.

## Security
All private pages retrieve a verified Supabase user server-side; PostgreSQL RLS enforces owner isolation. Supabase auth cookies are managed by SSR middleware. The private storage bucket has no client upload policy until scanning exists. Do not supply a service-role key to the browser.

## Deployment
Deploy to a Next.js-capable platform such as Vercel. Set the three environment variables and configure Supabase Auth public site URLs/redirects to the exact production domain. Apply migrations before release; test registration, email confirmation, password reset, RLS and privacy flows in a staging project first.

## Status and limitations
The repository was empty before this milestone. App code and migration are provided but **live provider integration has not been verified** without a configured Supabase project. Public launch requires operational monitoring, email deliverability, upload scanning, abuse controls, account export/deletion, privacy legal review, locale completion, database integration/e2e tests and a reproducible dependency lockfile. See docs and FEATURE_STATUS.md.
