# CareerOS Step 2 — personal-use acceptance matrix

**Scope:** CareerOS is a private, single-owner application. The earlier multi-user/SaaS release-gate plan is **optional hardening**, not a requirement to use or merge the personal beta. This change to acceptance criteria is not evidence that previously unrun tests passed.

| # | Personal beta requirement | Existing evidence | Minimum acceptance for personal use |
|---|---|---|---|
| 1 | Sign in to *your* account and save records | Supabase Auth, server identity checks, record CRUD and CI | One personal login; create a harmless dummy record, edit, reload, delete; no four-account staging |
| 2 | Keep your career information private | RLS on all 11 public database tables; owner filters; PostgreSQL policy smoke tests | Do **not** disable Auth, row-level security, private storage or server secret controls. Dedicated second-user staging is optional |
| 3 | PDF/DOCX → selected text → pending review → approval | Browser-local PDF/DOCX parsing passes CI; protected signed-in tests are written | Manually import one small *non-sensitive* test file into your account and approve a dummy fact; do not upload confidential files until satisfied |
| 4 | Export and data safety | Owner-scoped JSON exports, confirmation-gated Vault clearing and account deletion code | Download/export once and confirm a JSON file is produced. **Do not** live-test Vault wipe or account deletion on your only account; destructive tests become optional |
| 5 | Comfortable phone/Mac experience | Public mobile Chromium smoke and styling checks, opt-in keyboard tests | Open Vault on your phone/Mac and verify the core forms work. Formal VoiceOver/NVDA accessibility sign-off is optional |
| 6 | Reasonable personal privacy and security | Server-only service keys, Supabase Auth/RLS and security audit; some Supabase advisories remain | Use a strong unique password, keep backups and secrets private, do not disable RLS or publicly expose private uploads. Formal GDPR controller/DPA audits are not personal-beta blockers |
| 7 | Build/deploy and merge personal beta | GitHub CI passes; prior READY previews exist | Confirm latest commit CI and Vercel preview when available; merge after basic personal smoke and your approval, not after enterprise-wide staging tests |

## Personal-use boundary

**Safe to skip for now:** creating a dedicated Supabase staging project, four test users, automated two-user live isolation tests, full account-erasure drills, professional accessibility audit, commercial-grade retention/legal approval, and independent AI/scanner infrastructure if you are only using manual records and browser-local CV text review.

**Keep in place:** sign-in to your own account, ownership restrictions, RLS, server-side identity checks, no public file bucket, encrypted HTTPS, and safe account export. This is still an internet-connected application storing CV/personal data. Removing login entirely would require an alternate private access control and is **not part of this personal-beta simplification**.

**Optional features:** CareerOS independent AI interviews require a self-hosted Qwen/Ollama server; the separate server-side binary document upload requires private ClamAV scanning. Neither is needed for local PDF/DOCX-to-text review.

## Evidence labels

- **Implemented:** source exists.
- **CI passed:** simulated/unit/build/public-browser checks completed.
- **Personal smoke passed:** a real owner successfully used it.
- **Live deletion tested:** a disposable account was intentionally erased.
- **Production-grade:** requires stronger operational/legal/accessibility work.

Never label a missing or unexecuted live test as passed. Do not test destructive actions on the only account.

## Merge policy

Step 2 can become a **personal beta** without a separate staging project. Require at minimum passing branch CI, no discovered high-impact data exposure, confirmation that the user can sign in and retain/edit one test record, and explicit approval to merge. Privacy-sensitive functionality must remain access-controlled. For optional future multi-user/security testing, see `docs/STAGING_SECURITY_RUNBOOK.md` and `docs/DATA_RETENTION_AND_ACCOUNT_ERASURE.md`.
