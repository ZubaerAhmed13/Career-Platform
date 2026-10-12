# Twelve-stage roadmap

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

## Milestone 2 implementation note
Career Vault code, evidence model, unreviewed text intake and a provider-backed interview path have been submitted in a feature branch. Full Milestone 2 acceptance remains conditional on applying and testing the database migrations in staging and completing secure PDF/DOCX import and conflict resolution. Do not start Resume Studio implementation until the verified data ownership and relationship model is stable.

Milestone 2 conflict-review SQL uses migration 005. The next Resume Studio stage remains blocked until staging migrations, RLS verification and source-of-truth stability are checked.
