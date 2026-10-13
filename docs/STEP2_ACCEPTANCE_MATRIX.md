# CareerOS AI — Step 2 acceptance matrix (2026-10-13)

This matrix distinguishes **implemented code**, **verified local/CI behavior**, and **external acceptance**. A feature is not production-ready merely because it compiles.

| Step 2 requirement | Implementation | Verification and gaps |
|---|---|---|
| Career Vault dashboard | Implemented | Source/production build; authenticated browser still needed |
| Work experience, education, skills, projects | Manual CRUD implemented | Local PostgreSQL RLS/record tests; live persistence pending |
| Achievements, languages, certifications, volunteering | All eight categories supported | Source tests; live account acceptance pending |
| Server-backed career storage | Authenticated RLS code implemented | All migrations execute in disposable Postgres; hosted project not checked |
| Career evidence and relationships | Owner-scoped composite FKs + link UI | Local RLS/FK tests; two-user Supabase checks blocked |
| AI fact approval and selective merging | Owner-controlled RPCs, duplicate guards, structured field review | Local SQL execution and unit checks; hosted concurrency tests pending |
| AI Career Interviewer | Real provider-backed code | Requires server-only credentials; real model not called |
| PDF/DOCX CV import | Antivirus-gated extraction in code | Real ClamAV and sandboxed parser E2E blocked |
| Structured CV import | Section-based extraction + optional AI proposals, structured manual corrections for organization/location/dates and explicit approval | Import logic/source and local SQL tested; no OCR, automatic field/date inference or real scanner integration |
| Career profile JSON export | Authenticated owner-filtered export | Code present, live owner/export tests pending |
| Database security migrations | **001–012** in source; local PostgreSQL migrations and assertions | Not applied/confirmed on hosted Supabase |
| Real two-user security tests | Written and protected | Not executed; dedicated staging connection required |
| Responsive browser testing | Public/anonymous desktop + mobile Chromium smoke tests **passed** | Logged-in Vault/accessibility/mobile review not completed |
| Production release readiness | Not accepted | Hosted database, secrets, anti-malware, privacy and staging checks outstanding |

See [Pull Request #2](https://github.com/ZubaerAhmed13/Career-Platform/pull/2), \`docs/STEP2_ACCEPTANCE_MATRIX.md\`, \`docs/STAGING_SECURITY_RUNBOOK.md\` and \`docs/CV_SCAN_RUNBOOK.md\`.

**Do not merge into main or start Resume Studio based solely on CI.**

## Actual verification coverage
- Source CI validates TypeScript, ESLint, unit tests and production build.
- Disposable PostgreSQL 16 CI applies each numbered migration then checks owner isolation, verified AI persistence, approval, duplicate decisions, selected-field employer/date merges and AI rate limits.
- Desktop/mobile browser smoke CI checks public/auth routes, anonymous Vault redirect and horizontal overflow on representative public pages.
- **Not tested:** real authenticated Supabase sessions, two-user hosted RLS, scanner-down/malware fixtures, private parser worker, live AI provider output, multi-device conflicts, GDPR processes, production accessibility and email delivery.

## Secure completion path
1. Connect an authorized **dedicated Supabase staging project** using project management authorization, not a publishable key.
2. Preflight migration history/backups and deploy 001–012 in ascending order where genuinely outstanding.
3. Run the two-user staging integration suite, plus real signed-in browser persistence/export workflows.
4. Configure server-side AI and private ClamAV safely, validate protected RPCs, quotas, malware rejection, files and provider failures.
5. Conduct mobile/keyboard/screen-reader review, privacy/deletion review and production operational signoff.
