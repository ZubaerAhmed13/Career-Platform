# CareerOS AI — Run staging security tests safely

**No staging database tests have been executed in this development session.**

## Prerequisites
Provision a **separate disposable Supabase project** and two dedicated, confirmed test users. Do not reuse the primary CareerOS project (`jtitfwzpfbyfsdpxxrbj.supabase.co`) or any real applicants' accounts.

1. Determine the migration history of the dedicated staging project and confirm backup/recovery procedures.
2. Apply reviewed additive migrations 001–008 in ascending order. Check actual schema, RLS, triggers, grants, composite owner FK constraints, and locked-down AI RPCs. Do not silently apply migrations to another environment.
3. Under GitHub repository Settings → Environments, create an environment called `staging`, require approval for deployments/runs, and restrict access to the authorized operator.
4. Configure these encrypted **environment secrets** (not repository source files): `SUPABASE_TEST_PROJECT_URL`, `SUPABASE_TEST_PUBLISHABLE_KEY`, `SUPABASE_TEST_USER_A_EMAIL`, `SUPABASE_TEST_USER_A_PASSWORD`, `SUPABASE_TEST_USER_B_EMAIL`, `SUPABASE_TEST_USER_B_PASSWORD`.
5. Open GitHub → Actions → **Career Vault Staging Security** → Run workflow on `feat/milestone-2-career-vault`. Approve it through the protected staging environment.

The workflow is **manual-only**. It refuses missing project URL/publishable key and the known primary Supabase project. The integration test code also rejects the primary project and requires explicit mutation acknowledgement. It will create, update and delete disposable data; never point it at production.

## What the test suite verifies
- Identity isolation and rejection of cross-account reads, updates, deletion, foreign-key references and anonymous reads.
- Valid owner CRUD, approval RPC one-time semantics, rejected other-account approval and revision-aware field merge.
- Authenticated browser attempts to forge `assistant` messages, insert `origin='ai'` suggestions, and invoke service-role-only RPCs.
- Rejection of forged CV extraction RPC invocation by a normal account.

## Not verified by this automated workflow
- Actual privileged server-to-DB AI responses; verify separately using limited staging credentials in an isolated backend test.
- Antivirus scanner INSTREAM behavior and PDF/DOCX extraction with malicious/safe fixtures; follow `CV_SCAN_RUNBOOK.md`.
- Real model billing, latency, structured output semantics, retention and consent behavior.
- Full browser/mobile accessibility, email deliverability, password recovery, account deletion and public-launch privacy controls.

Record the workflow run ID, exact staging project reference (not its secrets), date, passed/failed tests and signoff decisions before marking Milestone 2 complete.
