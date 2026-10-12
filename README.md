# CareerOS AI

Secure account-based workspace with a **Career Intelligence Vault under Milestone 2 review**. Resume Studio, job discovery and application tracking are still future modules. Live service readiness is not confirmed.

## Stack
Next.js 15 App Router, React 19, strict TypeScript, Tailwind CSS 4, Supabase Auth/PostgreSQL/Storage (private bucket), Zod, next-themes, Vitest and GitHub Actions.

## Connect your Supabase project
Project URL: `https://jtitfwzpfbyfsdpxxrbj.supabase.co` (provided by the project owner).

1. Install Node.js 22 and run `npm install`.
2. Copy `.env.example` to `.env.local`. The correct project URL is prefilled. Fill `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` with **your** Supabase publishable key (`sb_publishable_…`). The publishable key is a public configuration value, not an admin key; keep all secret/service-role keys off the frontend and out of Git.
3. Apply all migrations **in order**: `supabase/migrations/202610120001_initial.sql`, `supabase/migrations/202610120002_restrict_unverified_file_metadata.sql`, `supabase/migrations/202610120003_career_vault.sql`, and `supabase/migrations/202610120004_career_suggestion_review.sql`, `supabase/migrations/202610120005_suggestion_conflicts.sql`, `supabase/migrations/202610120006_ai_usage_limits.sql` to the intended development/staging Supabase project. Prefer migration tooling for future changes. **Do not assume the migration was applied simply because it is in GitHub.**
4. In Supabase → Authentication → URL Configuration, set Site URL to `http://localhost:3000` for local testing. Add `http://localhost:3000/auth/callback` and `http://localhost:3000/auth/callback?next=/update-password` to redirect URLs. Configure email verification and an authorized email delivery provider.
5. Set `NEXT_PUBLIC_SITE_URL=http://localhost:3000` and run `npm run dev`. Visit `http://localhost:3000`; test with two distinct test users.

**When deploying:** set the three NEXT_PUBLIC_* environment variables in the host's environment configuration and set the production site/redirect URLs in Supabase Authentication. Do not upload `.env.local` to the public repository.

## Commands
`npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run dev`. For explicit two-user staging database security testing, see `docs/SUPABASE_SETUP.md` and run `npm run test:integration` only with disposable accounts and dedicated staging credentials.

## Security
Private pages require verified Supabase identity server-side; PostgreSQL RLS migration defines owner isolation. Supabase auth cookies are managed by SSR middleware. The private storage bucket has no client upload policy until scanning exists. The publishable key **does not itself provide RLS or user-data security**.

## Deployment
Deploy to a Next.js-capable platform such as Vercel; configure host environment and exact production Auth redirect URLs. Apply database migrations before release; test registration, verification, password reset, RLS, sessions and data privacy flows in staging first.

## Status and limitations
**GitHub source validation:** [CI run #38301391444](https://github.com/ZubaerAhmed13/Career-Platform/actions/runs/38301391444) passed installation, TypeScript, lint, all fifteen unit tests, and production build. These are code/build checks, not live Supabase tests. Source configuration now targets the supplied project URL, but connection to its database is **not yet verified** and the SQL migration is **not yet confirmed applied**. Public launch requires monitoring, email delivery, abuse controls, uploads scanning, account export/deletion, privacy legal review, localization, integration tests, security review and a reproducible lockfile. See docs and FEATURE_STATUS.md.

## Milestone 2 — Career Intelligence Vault
The authenticated `/career-vault` route supports manual career records, editing with optimistic revision checks, deletion with confirmation, record search/filter, evidence notes/URLs, same-owner relationship links, user-approved suggestions and a private downloadable JSON export. Categories include experience, education, skills, languages, projects, achievements, certifications, and volunteering. A separate `/career-vault/review` page accepts **pasted text only**, supports corrections and explicitly merging selected fields, and can request real provider-based structured extraction when configured; a fail-closed PDF/DOCX extraction form is now implemented but disabled unless an internal ClamAV scanner is configured and tested.

AI interviews at `/career-vault/interview` are **real provider-dependent operations**, not a demo chatbot. Configure server-only `OPENAI_API_KEY` (optional `CAREER_AI_MODEL`, default `gpt-4o-mini`), or the UI honestly reports unavailable. Career data is only sent after explicit consent. AI suggestions are separately approved; no confirmed record is silently replaced.

### Activation and validation
The previously supplied Supabase URL/publishable-key configuration is still used. Apply migrations 001–006 **only to a reviewed, backed-up intended project**. Detailed source and environment requirements are in `docs/SUPABASE_SETUP.md`. Run `npm test` and the CI scripts. Two-user authorization checks are available through `npm run test:integration` against a dedicated disposable staging project. Do not run those mutation tests on real user accounts.

See `docs/CAREER_VAULT_SPEC.md`, `docs/CAREER_EVIDENCE_MODEL.md`, `docs/CV_IMPORT_PIPELINE.md` and `docs/AI_CAREER_INTERVIEW_SPEC.md`. Code compilation is not evidence that the Supabase migration or external AI service has been tested.

**Status:** The Career Vault source and tests are a reviewable Step 2 pull request, not a verified live deployment. Supabase SQL and external AI usage have not been executed from this session.

### Document scanning
PDF/DOCX imports can only run with a trusted internal ClamAV `clamd` service that supports the INSTREAM protocol. Set **server-only** `CLAMAV_HOST` and optional `CLAMAV_PORT` (default 3310). The app **does not scan by itself** or accept uploads without a configured reachable scanner. Import is bounded to 2 MB, 12 PDF pages, 4,000 readable text characters, and DOCX ZIP envelope limits; nothing is placed in public file storage. There is no OCR and no permanent binary file storage. See `docs/CV_SCAN_RUNBOOK.md` for staging setup, operational hardening and acceptance tests.

### AI usage limits
Migration 006 adds a secure server-side quota function; both interview and text extraction must claim it before contacting a model. Default limits: 4 model requests/minute and 50/day per authenticated account. These safeguards require deploying migration 006 and are not proof of production-scale abuse resistance.

The latest source CI run #38303064913 passed install, TypeScript, lint, unit tests and build. Live Supabase, antivirus, and AI provider integration remain **unverified**.
