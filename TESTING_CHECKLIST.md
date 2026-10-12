# Actual verification and outstanding acceptance checks

## Completed GitHub validation

- 2026-10-12 CI run #38294023211: dependency installation passed; TypeScript failed on SSR cookie callback types; later stages skipped.
- 2026-10-12 CI run #38294969904: dependency install and TypeScript passed; lint failed on an internal anchor; tests/build skipped.
- 2026-10-12 CI run #38295911272: install, TypeScript, lint, 3 unit tests, production build passed.
- 2026-10-12 CI run #38297687890: **install, TypeScript, lint, 7 unit tests, production build all passed**. [Run link](https://github.com/ZubaerAhmed13/Career-Platform/actions/runs/38297687890)

Tests verify form schema, profile completion, owner-ID stripping and local redirect/origin safety. CI uses a placeholder publishable key and does **not** call a live Supabase database. These results do not prove functioning signup, sessions or DB isolation.

## Required staging-only tests (not executed)

- [ ] Apply SQL migrations 001 and 002 in the selected Supabase project, verify tables, triggers, policies and private storage bucket.
- [ ] Register two **distinct** disposable users, verify email delivery and confirmation, login, session persistence, recovery and logout.
- [ ] Run `npm run test:integration` against a **dedicated staging project** using the variables in `docs/SUPABASE_SETUP.md`. No production user accounts.
- [ ] Verify User A/B isolation for profile reads/writes, anonymous access denial and disabled file metadata insertion.
- [ ] Inspect deployed client bundles for server credentials, test expired sessions and callback redirects.
- [ ] Keyboard-accessibility and mobile smoke tests at 320px, phone, tablet, desktop; check both themes.
- [ ] Configure the deployed public origin, redirect allowlist, verified email provider, monitoring and privacy rights flows.

**Blocking dependencies:** Connected, authorized Supabase management access is not available in this session; neither migration execution nor live user authentication has been verified. A deployment target/domain also has not been specified.

## Milestone 2 status (2026-10-12)
Automated unit tests include career record validation, localized text, counts, date consistency, and invalid AI outputs/unsupported quotes. GitHub CI runs install/typecheck/lint/unit/build using dummy public Supabase credentials, and does **not** apply database migrations or call OpenAI. The staging integration suite `tests/integration/career-vault.test.ts` exercises cross-owner operations, composite foreign key constraints, AI-session scoping, suggestion approval, and unauthorized record writes. It requires disposable staging credentials, so results must remain **blocked** until the actual command runs.

Manual checks still required: apply migrations in a backed-up staging database, registration/login persistence, edit conflicts across two sessions, mobile/keyboard/screen reader review, export ownership test, real AI service timeout and structured response testing, multilingual export, user-directed deletions, authorization of related references and provider failure states. PDF/DOCX import is **not implemented**, so its upload/extraction tests cannot be marked passed.

## Milestone 2 review refinements
Migration 005 adds edit/merge RPCs with explicit confirmation and a stale-revision check. The review UI supports keep/reject, edit, save separately and selective merge. The pasted-text AI extraction route requires a server-side OpenAI key and consent; it has not been tested live. Relationship unlinking, interview completion, date filtering and career event summaries have been added; browser and staging database acceptance tests remain outstanding.
