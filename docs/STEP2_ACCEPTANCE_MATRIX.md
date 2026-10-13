# CareerOS Step 2 — evidence-based acceptance matrix

**Audit date:** 2026-10-13. **Repository:** `ZubaerAhmed13/Career-Platform`, draft PR #2, branch `feat/milestone-2-career-vault`.

The words **implemented**, **CI passed**, **staging accepted** and **production released** mean different things. Do not mark any item complete without the specific evidence in the last two columns.

| Priority | Required acceptance | Implemented/test available | Actually verified | Remaining gate |
|---|---|---|---|---|
| 1 | Real-account login, CRUD, save, reload, edit/delete and re-login | Signed-in Playwright staging case; server actions and RLS | Unit, PostgreSQL CI, anonymous browser; **not a real signed-in test** | Execute with disposable staging Account A |
| 2 | Cross-user isolation | Two-account Supabase integration tests and owner/foreign export browser checks | Disposable PostgreSQL owner/RLS tests; hosted schema RLS enabled | Run with distinct confirmed Accounts A/B and record evidence |
| 3 | PDF/DOCX-to-text through review and approved saved record | Browser Web Worker tests + signed-in end-to-end PDF case | Real desktop/mobile PDF/DOCX parsing in anonymous fixture CI | Run real signed-in staging save, pending review, approval, reload, secondary-user check |
| 4 | Exports, Vault clear and hard account deletion | Account/Vault JSON exports, owner-only Vault clear RPC, password-confirmed account deletion code, extra manual opt-in destructive test | Anonymous export denial, local SQL clearing assertions and 11 live schema user-FK cascades | Run against **separate throwaway** Accounts C/D, verify no cross-user changes; complete operator backup/deletion review |
| 5 | Logged-in mobile, keyboard, accessibility | Skip-to-main link, responsive overflow safeguards, keyboard focus and labeled-form checks; broader signed-in mobile suite | Anonymous desktop/mobile CI only | Run signed-in desktop/mobile; human keyboard + VoiceOver/NVDA screen-reader walkthrough |
| 6 | Privacy, retention, security | Server-side auth guards, RLS, explicit grants, provenance, scanner fail-closed; retention/erasure runbook | 18 hosted Supabase migrations; 11/11 public tables RLS; Supabase security advisories reviewed | Enable leaked-password protection; audit 9 definer RPC grants and execute permissions, obtain provider retention/backup contract, controller privacy notice and operator approval |
| 7 | Current deployment, final docs, PR merge | Docs/runbook/CI automation in PR #2 | Prior older SHA Vercel previews READY, newest source commit CI to be recorded below | Deploy **exact PR head**, verify Vercel READY and private configured services, finish above tests then review/merge |

## Environments and test-data boundaries

- **Production Supabase:** `jtitfwzpfbyfsdpxxrbj` (**NEVER** point authenticated mutation/erasure test suites at this project).
- Dedicated disposable staging Supabase project: **not connected or provisioned at this audit**.
- Production Vercel project: `career-platform`, prior preview builds READY at older commits; **do not infer current PR head was deployed**.
- The protected staging workflow `.github/workflows/staging-security.yml` is manual-only and requires the GitHub `staging` environment, six staging credentials and approval.
- Destructive tests `tests/e2e/staging-privacy-erasure.spec.ts` require **two extra newly created empty accounts** in the same staging project, staging-only admin credentials and the exact environment acknowledgement `CAREER_STAGING_ERASURE=I_UNDERSTAND_DELETES_DISPOSABLE_USERS`.
- Never run destructive testing against real applicants; never add credential values, user exports, traces or token contents to public logs.
- The manual workflow must be present on the default branch to support `workflow_dispatch`. Until then, only a trusted local checkout with protected staging credentials can execute it.

## Security findings requiring an operator decision

The 2026-10-13 live Supabase advisors report:

1. `auth_leaked_password_protection` WARN: leaked-password protection disabled. Operator must enable [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
2. `authenticated_security_definer_function_executable` WARN (9 functions): privileged RPC access needs scope-by-scope security review; **do not indiscriminately revoke** because reviewed owner-scoped approval/quota/clearing RPCs must be accessible to signed-in users. They use `auth.uid()`, pinned search paths and owner checks; nevertheless verify each exposed API before production sign-off. [Advisor details](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
3. `rls_enabled_no_policy` INFO on `career_ai_usage`: intentionally denies all browser access; server-only quota RPC owns the writes. No new table policy should be granted merely to silence this advisory.

The website must not claim GDPR compliance or a complete subject-access export until provider backups, operational logs, the data controller, legal grounds and contact/retention notices have been approved.

## Merge decision

**Current verdict: BLOCKED.** A passing build and PostgreSQL fixture smoke test are insufficient to establish real account isolation, effective erasure, AI host availability, or live deployment. Merge only after protected staging results and the exact-head Vercel preview are recorded, all critical release gates pass, and a human authorizes production promotion.
