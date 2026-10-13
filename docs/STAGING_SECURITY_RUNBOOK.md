# CareerOS AI — Run staging security tests safely

**Status:** The authenticated staging suites exist in source, but no dedicated staging Supabase project or two confirmed test users have been provided/validated in this session. Do not describe these tests as passed until a protected workflow actually completes.

## Prerequisites
Provision a **separate disposable Supabase project** and two dedicated, confirmed test users. Do not reuse the primary CareerOS project (`jtitfwzpfbyfsdpxxrbj.supabase.co`) or any real applicants' accounts.

1. Determine the migration history of the dedicated staging project and confirm backup/recovery procedures.
2. Apply reviewed additive migrations 001–008 in ascending order. Check actual schema, RLS, triggers, grants, composite owner FK constraints, and locked-down AI RPCs. Do not silently apply migrations to another environment.
3. Under GitHub repository Settings → Environments, create an environment called `staging`, require approval for deployments/runs, and restrict access to the authorized operator.
4. Configure these encrypted **environment secrets** (not repository source files): `SUPABASE_TEST_PROJECT_URL`, `SUPABASE_TEST_PUBLISHABLE_KEY`, `SUPABASE_TEST_USER_A_EMAIL`, `SUPABASE_TEST_USER_A_PASSWORD`, `SUPABASE_TEST_USER_B_EMAIL`, `SUPABASE_TEST_USER_B_PASSWORD`.
5. **Before the workflow has been added to `main`**, GitHub may not expose its manual Run workflow control: `workflow_dispatch` workflows must exist on the default branch. During draft PR review, run `npm run test:integration` from a trusted, checked-out local workspace with the staging variables in `docs/SUPABASE_SETUP.md` instead. Once the workflow file has been reviewed and introduced to the default branch, open GitHub → Actions → **Career Vault Staging Security** → Run workflow on the desired tested branch. Approve it through the protected staging environment.

The workflow is **manual-only**. It refuses missing project URL/publishable key and the known primary Supabase project. The integration test code also rejects the primary project and requires explicit mutation acknowledgement. It will create, update and delete disposable data; never point it at production. After running the API ownership suite, the workflow now installs Chromium and runs `tests/e2e/staging-career-vault.spec.ts` on a locally served Next.js app connected **only to that staging project**. The Playwright config requires `CAREER_STAGING_E2E=I_UNDERSTAND_STAGING_ONLY` and refuses the production hostname. Browser trace, screenshot and video capture are disabled for staging runs to avoid exposing credentials or sessions in artifacts.

## What the test suite verifies
- Identity isolation and rejection of cross-account reads, updates, deletion, foreign-key references and anonymous reads.
- Valid owner CRUD, approval RPC one-time semantics, rejected other-account approval and revision-aware field merge.
- Authenticated browser attempts to forge `assistant` messages, insert `origin='ai'` suggestions, and invoke service-role-only RPCs.
- Rejection of forged CV extraction RPC invocation by a normal account.
- **Signed-in browser acceptance (new):** real owner record create/reload/edit/delete, PDF-to-text local extraction with explicit review consent, pending-only proposal persistence, per-user JSON export, invisibility of another user's proposals/records, explicit approval, and authenticated mobile overflow checks.
- The browser tests clean up their uniquely tagged staging fixtures. If a test fails during cleanup, manually inspect and remove *only that test fixture* from the disposable staging project; never clear a real user's Vault.

## Not verified by this automated workflow
- Actual privileged server-to-DB AI responses; verify separately using limited staging credentials in an isolated backend test.
- Antivirus scanner INSTREAM behavior and PDF/DOCX extraction with malicious/safe fixtures; follow `CV_SCAN_RUNBOOK.md`.
- Real model billing, latency, structured output semantics, retention and consent behavior.
- Full browser/mobile accessibility, email deliverability, password recovery, account deletion and public-launch privacy controls.

Record the workflow run ID, exact staging project reference (not its secrets), date, passed/failed tests and signoff decisions before marking Milestone 2 complete.

## New browser acceptance sign-off (13 October 2026)

The normal PR CI still uses dummy Supabase credentials for public/anonymous browser smoke tests. It **cannot** be counted as authenticated staging acceptance. The protected manual workflow must run with the staging credentials, and its Chromium tests must actually pass. For branch-local review before the manual workflow is on `main`, set the six `SUPABASE_TEST_*` variables from the dedicated disposable test project, set `CAREER_STAGING_E2E=I_UNDERSTAND_STAGING_ONLY`, and run `npx playwright test tests/e2e/staging-career-vault.spec.ts` with the reviewed branch checked out. Keep credentials out of terminal output and source files.

No production database mutations are authorized by this runbook. The primary CareerOS project is `jtitfwzpfbyfsdpxxrbj` and must never be used for these mutation tests. A READY Vercel preview or green anonymous smoke checks do not replace this sign-off.

## Protected destructive acceptance and keyboard update — 13 October 2026

Regular staging security tests now include **relogin persistence** and additional labeled-form / keyboard skip-link and responsive-private-route checks. Those are test definitions, not live pass results.

Optional irreversible tests are in `tests/e2e/staging-privacy-erasure.spec.ts`. They must **not run** unless an authorized operator explicitly sets `CAREER_STAGING_ERASURE=I_UNDERSTAND_DELETES_DISPOSABLE_USERS` as an approved **GitHub staging Environment variable**. Two **additional distinct, empty, throwaway users** are needed, besides the two users for regular RLS tests:
- `SUPABASE_TEST_PURGE_USER_EMAIL` / `SUPABASE_TEST_PURGE_USER_PASSWORD` (Vault clear; account remains)
- `SUPABASE_TEST_DELETE_USER_EMAIL` / `SUPABASE_TEST_DELETE_USER_PASSWORD` (permanent hard account deletion)

The optional workflow step also requires `SUPABASE_TEST_DELETE_SERVICE_ROLE_KEY` configured in the protected staging Environment as a secret, passed only to that isolated step under `SUPABASE_SERVICE_ROLE_KEY`. **Never reuse production's service-role key.** The Playwright preflight rejects missing configuration, a production project URL or duplicate identities; any failure must block release rather than be bypassed.

The destructive test confirms export-before-clear, typed-confirmed clearing, disappearance of Vault records after export, relogin after Vault-only clear, a separately typed/password-confirmed account deletion, and denied login after hard deletion. It should also be independently audited for backup retention, non-primary identity preservation, and operator approval.

Screen-reader testing (VoiceOver/NVDA), real identity email delivery and hardware/browser variants require explicit human signoff. Automatic keyboard and overflow assertions alone do not prove WCAG compliance.

## PDF and DOCX staging parity

The owner acceptance now contains separate PDF and DOCX local-import cases. For each format it saves only pending owner-controlled text, waits for the persisted approved review-history state, confirms an owner-specific, source-preserving record, and cleans up test-only data. The normal PR workflow runs Playwright `--list` to detect staging test collection failures; it **never** executes authenticated mutation/erasure tests without an approved isolated staging configuration.

For manual screen-reader, focus and keyboard acceptance, follow `docs/STEP2_ACCESSIBILITY_SIGNOFF.md`. No automated checks alone establish full accessibility compliance.
