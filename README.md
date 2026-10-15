# CareerOS AI

## Development mode — GitHub only

**Owner decision (2026-10-15): Do not host or deploy this website until the owner is fully satisfied and explicitly approves hosting.** Continue coding, reviews and automated tests exclusively in GitHub. Root `vercel.json` sets `git.deploymentEnabled: false` to pause all automatic Git-based Vercel deployments. This does not delete or switch off any previously deployed site; hosting-provider management is postponed. Do not invoke Vercel tools, trigger previews, or use deployment readiness as a development milestone. Preserve existing AI integration for future upgrades, but do not require a running AI model for current non-AI development. Security and privacy tests are still required before any eventual release.

Secure account-based workspace. **Career Intelligence Vault Step 2 is merged in `main` as a personal code-level beta** (PR #2 and #3). A subsequent Step 2 quality upgrade is under review in [PR #4](https://github.com/ZubaerAhmed13/Career-Platform/pull/4). Resume Studio, job discovery and application tracking remain future stages. Logged-in real-account acceptance is not independently verified; no hosting action is authorized.

## Stack
Next.js 15 App Router, React 19, strict TypeScript, Tailwind CSS 4, Supabase Auth/PostgreSQL/Storage (private bucket), Zod, next-themes, Vitest and GitHub Actions.

## Connect your Supabase project
Project URL: `https://jtitfwzpfbyfsdpxxrbj.supabase.co` (provided by the project owner).

1. Install Node.js 22 and run `npm install` (or `npm ci` once a reviewed lockfile is committed).
2. Copy `.env.example` to `.env.local`. The correct project URL is prefilled. Fill `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` with **your** Supabase publishable key (`sb_publishable_…`). The publishable key is a public configuration value, not an admin key; keep all secret/service-role keys off the frontend and out of Git.
3. Apply all migrations **in order**: `supabase/migrations/202610120001_initial.sql`, `supabase/migrations/202610120002_restrict_unverified_file_metadata.sql`, `supabase/migrations/202610120003_career_vault.sql`, and `supabase/migrations/202610120004_career_suggestion_review.sql`, `supabase/migrations/202610120005_suggestion_conflicts.sql`, `supabase/migrations/202610120006_ai_usage_limits.sql`, `supabase/migrations/202610120007_ai_provenance.sql`, and `supabase/migrations/202610120008_verified_cv_and_urls.sql` to the intended development/staging Supabase project. Prefer migration tooling for future changes. **Do not assume the migration was applied simply because it is in GitHub.**
4. In Supabase → Authentication → URL Configuration, set Site URL to `http://localhost:3000` for local testing. Add `http://localhost:3000/auth/callback` and `http://localhost:3000/auth/callback?next=/update-password` to redirect URLs. Configure email verification and an authorized email delivery provider.
5. Set `NEXT_PUBLIC_SITE_URL=http://localhost:3000` and run `npm run dev`. Visit `http://localhost:3000`; test with two distinct test users.

**When deploying:** set the three NEXT_PUBLIC_* environment variables in the host's environment configuration and set the production site/redirect URLs in Supabase Authentication. Do not upload `.env.local` to the public repository.

## Commands
`npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run dev`. For explicit two-user staging database security testing, see `docs/SUPABASE_SETUP.md` and run `npm run test:integration` only with disposable accounts and dedicated staging credentials.

## Security
Private pages require verified Supabase identity server-side; PostgreSQL RLS migration defines owner isolation. Supabase auth cookies are managed by SSR middleware. The private storage bucket has no client upload policy until scanning exists. The publishable key **does not itself provide RLS or user-data security**.

## Future deployment (paused)
**Do not deploy now.** After the owner explicitly authorizes hosting, choose a Next.js-capable platform and configure exact production Auth redirect URLs and server-side environment. Apply reviewed database migrations and test sign-in and privacy; none of these steps is a GitHub-only Step 2 acceptance requirement.

## Status and limitations
**Historical GitHub validation:** [CI run #38301391444](https://github.com/ZubaerAhmed13/Career-Platform/actions/runs/38301391444) passed installation, TypeScript, lint, all fifteen unit tests, and production build. These are code/build checks, not live Supabase tests. The connected CareerOS Supabase backend has **18 applied migrations and RLS enabled on all 11 public tables**. Authenticated staging acceptance is still outstanding. A future public launch requires monitoring, email delivery, abuse controls, scanner decisions, privacy/legal review, integration testing and security signoff. These are not current GitHub-only feature-development blockers. See docs and FEATURE_STATUS.md.

## Milestone 2 — Career Intelligence Vault

See [FEATURE_STATUS.md](FEATURE_STATUS.md) for current vs historical evidence. PR #4 adds category-specific record fields and multi-part full-CV manual review; each part remains a pending proposal until explicitly approved.
The authenticated `/career-vault` route supports manual career records, editing with optimistic revision checks, deletion with confirmation, record search/filter, evidence notes/URLs, same-owner relationship links, user-approved suggestions and a private downloadable JSON export. Categories include experience, education, skills, languages, projects, achievements, certifications, and volunteering. The `/career-vault/review` page accepts pasted text **and local text-based PDF/DOCX reading in the browser** with human approval; original file bytes stay on the device. It also supports corrections and selected-field merges. The separate optional server-upload pipeline remains fail-closed until ClamAV and the isolated parser are provisioned.

AI interview code at `/career-vault/interview` **supports a future self-hosted Qwen3 / Ollama model**, not a commercial model API. The model is not active. Configure `SELF_HOSTED_LLM_URL`, `SELF_HOSTED_LLM_TOKEN`, and `SUPABASE_SERVICE_ROLE_KEY` only on the server. See `docs/SELF_HOSTED_AI.md`. Career data is processed only after consent. AI suggestions are separately approved; no confirmed record is silently replaced.

### Activation and validation
The previously supplied Supabase URL/publishable-key configuration is still used. Apply migrations 001–008 **only to a reviewed, backed-up intended project**. Detailed source and environment requirements are in `docs/SUPABASE_SETUP.md`. Run `npm test` and the CI scripts. Two-user authorization checks are available through `npm run test:integration` against a dedicated disposable staging project. Do not run those mutation tests on real user accounts.

See `docs/CAREER_VAULT_SPEC.md`, `docs/CAREER_EVIDENCE_MODEL.md`, `docs/CV_IMPORT_PIPELINE.md` and `docs/AI_CAREER_INTERVIEW_SPEC.md`. Code compilation is not evidence that the Supabase migration or external AI service has been tested.

**Status:** Career Vault source is merged on `main`; its post-merge refinements are in PR #4. Real signed-in acceptance remains open. Self-hosted AI and optional scanner hosting are deferred by owner choice.

### Document scanning
Only the **optional server-upload path** requires a trusted ClamAV service. Browser-local PDF/DOCX reading is available without a scanner and sends only explicitly selected text for review. For the separate server-upload path, ClamAV `clamd` must support INSTREAM. Set **server-only** `CLAMAV_HOST` and optional `CLAMAV_PORT` (default 3310). The app **does not scan by itself** or accept uploads without a configured reachable scanner. Import is bounded to 2 MB, 12 PDF pages, 4,000 readable text characters, and DOCX ZIP envelope limits; nothing is placed in public file storage. There is no OCR and no permanent binary file storage. See `docs/CV_SCAN_RUNBOOK.md` for staging setup, operational hardening and acceptance tests.

### AI usage limits
Migration 006 adds a secure server-side quota function; both interview and text extraction must claim it before contacting a model. Default limits: 4 model requests/minute and 50/day per authenticated account. These safeguards require deploying migration 006 and are not proof of production-scale abuse resistance.

Historical source CI run #38303064913 passed install, TypeScript, lint, unit tests and build. Live Supabase, antivirus, and AI provider integration remain **unverified**.

### Verified AI provenance
Migrations 007 and 008 prohibit ordinary browser sessions from impersonating an AI interviewer or saving AI-origin fact proposals. The server verifies the account and session before invoking a **service-role-only** transactional database function. This requires setting `SUPABASE_SERVICE_ROLE_KEY` on the protected server environment, **not** in the browser or GitHub. The interview and AI extraction interfaces stay disabled without this trusted persistence key. Once authenticated, manual career editing, pasted CV review and JSON export do **not** require this key.

### Practical file upload limit
The Next.js Server Actions request cap is configured to `3mb` for the 2 MiB binary CV limit plus form overhead. Server-side byte limits, a clean clamd verdict and parser checks are still enforced independently.

See `docs/AI_TRUST_BOUNDARY.md` and the updated staging runbook. Migrations/authorization and scanner/model integration have **not** been applied or verified against a live project.

## Latest Career Vault milestone verification (2026-10-12)
**Do not consider Milestone 2 production-complete yet.** Source now includes migrations 001–010. SQL migrations are actually executed in an isolated PostgreSQL 16 CI container with simplified auth/storage compatibility fixtures, followed by RLS, provenance, service-AI persistence and quota assertions. This **does not** establish that these migrations have been applied to the hosted Supabase project, nor does it simulate all Supabase Auth behavior.

Manual record edits now preserve original record provenance and unrelated structured detail fields. CV file import supports optional user-consented AI extraction into separate reviewable facts (only when ClamAV, AI and protected database persistence are available). The Vault dashboard presents a factual career overview and an organization filter. Interview context is ranked by the selected topic and capped to eight records.

In addition to `npm run typecheck`, `npm run lint`, `npm test` and `npm run build`, the repository contains `npm run test:e2e` for public desktop/mobile flows and unauthorized vault access; Playwright browsers must be installed. CI validates migration SQL and browser smoke tests separately. Real authenticated staging acceptance still requires Supabase management access.

**Remaining SQL migrations:** 009 enforces immutable source/status provenance on manual record edits; 010 fixes an AI persistence SQL alias ambiguity discovered by executing actual database assertions. Apply them after 001–008, only after backup and migration-history review.


## Step 2 source updates — 13 October 2026
Historical implementation note: migrations **001–012** were later supplemented through 018; see the current release matrix. New migration 011 serializes imported suggestion approval and blocks accidental same-title duplicates; a distinct separate-record choice requires explicit user confirmation. Migration 012 stores user-reviewed organization, location, start/end and ongoing status on pending import proposals. Approved records retain corrected structured fields. Selective merges can replace chosen title, description, organization, location or complete date range, using revision checks.

**CV text segmentation:** labeled sections such as Work Experience, Education, Technical Skills, Languages, Projects, Certifications, Achievements and Volunteering can be split into up to six separately reviewable fact candidates, without using AI. Unrecognized text is saved as a single unreviewed item. Source excerpts are checked against original text; no employer, dates or credentials are inferred. Secure PDF/DOCX handling still requires ClamAV; optional AI extraction requires separate consent and provider credentials. OCR/advanced CV field extraction is not available.

Check \`FEATURE_STATUS.md\` for the current verified status. The hosted CareerOS project was subsequently configured with 18 schema migrations; this paragraph describes an earlier stage.


## Confirmed Supabase activation — 13 October 2026
An authorized Supabase management connection applied all CareerOS schema and hardening migrations to project `jtitfwzpfbyfsdpxxrbj` and verified the RLS tables, grants and indexes. The recorded migration versions were generated by the connector; see `docs/LIVE_SUPABASE_DEPLOYMENT.md` before any future CLI migration push. **Backend schema is active; authenticated app E2E, public hosting, AI and document-scanning services are not yet confirmed.**

### AI Pro focus
The AI is exclusively for eliciting, correcting and validating career evidence. It asks professional, scoped STAR-E follow-ups, does not manufacture accomplishments and never confirms a fact without owner review. Specialist session topics and exact AI reply-to-answer links are supported. Source and privacy details: `docs/CAREER_AI_PRO_ACCEPTANCE.md`.


## Fully independent model inference (feature branch)
CareerOS AI's inference adapter now calls only the private Ollama JSON-schema API. The default Qwen3 8B weights are Apache-2.0 open weights, not original CareerOS model weights. The operator owns inference hardware and the HTTPS gateway; neither OpenAI keys nor any paid AI inference service are required. An independent model server **still must be provisioned**; this repository does not automatically deploy GPU hardware. \`SUPABASE_SERVICE_ROLE_KEY\` remains a separate privileged database credential, not an AI inference provider credential. Setup: [docs/SELF_HOSTED_AI.md](docs/SELF_HOSTED_AI.md).


### Secure binary CV import
PDF/DOCX uploads are intentionally fail-closed. The independent inference host can run an official ClamAV scanner sidecar and a Caddy-authenticated `/scan` gateway, with a separate bearer secret. Vercel uses private server-side `CV_SCAN_GATEWAY_URL` and `CV_SCAN_GATEWAY_TOKEN` variables. The system will not enable uploads until that private scanner is configured. Provisioning/real ClamAV tests and parser isolation remain outstanding. See `docs/CV_SCAN_RUNBOOK.md`.


### Step 2 acceptance and privacy
The protected Career Vault preview also offers a private JSON export and a deliberately confirmation-gated way to clear one's own saved career records, evidence, interviews, proposals and activity without deleting the login account. Production binary CV parsing is now designed to run **outside Vercel** in a restricted container after ClamAV scanning; the live server remains a release prerequisite. For the exact operational gates, see [Step 2 release gates](docs/STEP2_RELEASE_GATES.md).


### New — import CV locally without a scanner server
The Career Vault review page now offers **browser-only PDF/DOCX text extraction**. The original file remains on the user's device; they edit the extracted text and submit only that selection for pending Supabase review. No GPU, ClamAV, AI provider key, or added backend is required. The existing server-scanned option remains disabled until antivirus infrastructure is installed. Full details: [docs/BROWSER_LOCAL_CV_IMPORT.md](docs/BROWSER_LOCAL_CV_IMPORT.md).


### Browser-local CV review — no scanner/GPU needed
In Career Vault → Review before saving, users can open a **text-based PDF or DOCX locally on their own device**, edit the extracted text (up to 4,000 characters), and explicitly save only that selected text as unconfirmed, owner-private suggestions in Supabase. The original PDF/DOCX is never posted to CareerOS; this is **not** antivirus scanning and users should open documents they trust. The optional separate server-scanned upload route stays disabled while ClamAV is unavailable. See [browser-local import guide](docs/BROWSER_LOCAL_CV_IMPORT.md). Desktop and mobile Chromium extraction tests run in GitHub CI; authenticated real-account save acceptance is a separate gate.
