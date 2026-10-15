# CareerOS Step 2 — practical personal-beta release

**Scope:** One owner, private use. CareerOS is not launching as a public applicant-data service. Avoid unnecessary staging costs and professional SaaS compliance tasks. See `docs/STEP2_ACCEPTANCE_MATRIX.md` for the concise seven-task checklist.

## Available in merged Step 2 code

- Eight categories of Career Vault facts, manual create/edit/delete and source-preserving records.
- Browser-local text-based PDF/DOCX import that never uploads the original binary; selected text stays pending until the owner approves.
- Saved suggestions, provenance, evidence, link/merge workflows, CV review and interview history.
- Downloadable personal JSON archive and confirmation-gated Vault/account erasure controls.
- Existing Supabase Auth, owner-scoped RLS, server-side session checks and private storage policy.
- GitHub CI for TypeScript/lint/tests/build, SQL migrations, public desktop/mobile Chromium and safe staging-test discovery.
- Independent career-only Qwen/Ollama **adapter**; actual AI conversation is unavailable until you host/configure the private model.

## Minimum before considering the code-level beta polished

1. CI completes successfully on the branch head.
2. Inspect the GitHub-only branch diff, unit tests and local-browser fixture results. Hosting and Vercel previews are deliberately paused; neither is a Step 2 gate.
3. Owner signs in once, creates an obviously disposable career record, edits it, reloads, and deletes that test record.
4. Owner imports a small non-sensitive text PDF or DOCX, reviews the extracted text, approves one dummy candidate, and can see the approved record.
5. Owner downloads an account/Vault JSON export and stores a private copy.
6. Keep Supabase RLS and server-only service-role secrets intact; do not run or enable a hosting preview while development is GitHub-only. Account wiping and deletion should **not** be tested with the real account.
7. Merge the reviewed GitHub PR after green branch checks. For the new PR #4, preserve the previous personal beta on `main` until validation is complete; do not claim live browser acceptance based on CI alone.

## Deferred rather than mandatory

- A second Supabase project, 2–4 disposable test accounts, two-user live isolation acceptance and live account-deletion drills.
- Dedicated screen-reader/WCAG audit, GDPR controller/DPA/business privacy policy, backup-retention certification and commercial operating procedures.
- Hosted Qwen/Ollama compute and optional server-side ClamAV scanning; manual Career Vault and browser-local document reading remain usable without them.
- Additional security hardening (e.g. Supabase leaked-password protection, detailed privileged-function review and abuse prevention) is **recommended**, but should not block personal-beta use when no evidence of exposure exists.

## Safeguards that cannot be deferred

Do not eliminate all sign-in protections on an internet-accessible personal-data app, disable RLS, expose the Supabase service role key/browser secret, use public Storage uploads for CVs, or erase your only account to prove deletion. Keep a current export so changes can be recovered. Do not imply GDPR compliance or claim unexecuted tests passed.

## Optional future testing

The old enterprise-grade staging suites and manual workflows remain in the repository for a future expansion. Run them only with a **dedicated disposable Supabase project** and the documented explicit opt-in; never use the only live account as a test fixture. Full details: `docs/STAGING_SECURITY_RUNBOOK.md`, `docs/STEP2_ACCESSIBILITY_SIGNOFF.md`, `docs/DATA_RETENTION_AND_ACCOUNT_ERASURE.md`.
