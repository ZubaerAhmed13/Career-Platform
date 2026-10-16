# Twelve-stage roadmap

## Current operating mode — GitHub development only (2026-10-15)

The owner will decide when the website is satisfactory and explicitly authorize hosting. Until then, work only in GitHub (code, PRs, GitHub Actions and non-deployed test fixtures). No Vercel deployments, preview readiness checks or production-promotion requirements apply to development milestones. Automatic Git deployments are paused by root `vercel.json`; do not re-enable them during feature work. Self-hosted AI and the optional scanner-based server upload remain preserved for future updates, but their external infrastructure is not a blocker for non-AI milestones. This does not waive security, data integrity, privacy and functional testing. Live connected-service operations require separate owner direction.

1. Core SaaS foundation (this change; provider verification pending)
2. Permanent Career Intelligence Vault and evidence-backed fact model
3. Resume Studio template/preview and printable documents
4. Advanced resume tailoring against real vacancies
5. Cover Letter Studio and editing workflow
6. Job Description Intelligence and verified matching
7. Application Tracker and immutable document versions
8. Interview Preparation Academy
9. Job Discovery and saved opportunities
10. Career Development/skill pathways
11. Consented intelligent automation and alerts
12. Public-launch security, localization, privacy, operations and reliability hardening

Each stage requires reviewed migrations, tests, truthful feature status and preservation of previous stages.

## Milestone 2 current status — 15 October 2026

Step 2 code merged into `main` through PR #2 (Career Vault) and PR #3 (export reliability). GitHub-only refinement PR #4 was merged on 15 October 2026, adding structured record inputs, full-CV multipart text review and source-backed, no-silent-truncation import behavior. This is a **source-level personal beta**, not a real-account acceptance signoff; staging/erasure remain optional protected test suites.

Current operating rules: no Vercel or other deployment actions, no live Supabase mutations, and no AI/model hosting requirements without explicit owner instruction. Resume Studio is Stage 3 and should consume the existing immutable/confirmed source-of-truth contract. Historical deployment and scanner-dependent gates are not prerequisites for non-AI GitHub-only development.

## Step 3 — Resume Studio source release (16 October 2026)

Step 3 was squash-merged into `main` via [PR #6](https://github.com/ZubaerAhmed13/Career-Platform/pull/6). It provides source-backed resume drafts, eight category-aware sections, five professional templates, optional portrait, content/design/preview workspace, separate revisions, private version history, genuine Word and text output and print/PDF capability.

Code-level checks include TypeScript, lint, unit tests, Next build, disposable PostgreSQL migration and owner-RLS assertions, Word parser integrity, and synthetic desktop/mobile browser scenarios. The migration is **present in GitHub but not applied to the live Supabase project**; real-account data persistence and manual signed-in usability are still outstanding acceptance gates. No hosting, AI or external scanner has been activated. Step 4 job tailoring remains future work.
