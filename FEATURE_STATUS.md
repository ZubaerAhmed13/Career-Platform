# Feature status — Milestone 1 (2026-10-12)

| Feature | Status | Evidence / blocker |
|---|---|---|
| Public home and planned-module states | Implemented, build-verified | Next.js build green |
| Registration, login and logout | Implemented, live test pending | Supabase Auth server actions |
| Confirmation and password recovery | Implemented, live test pending | Callback routes and recovery forms |
| Private route guard | Implemented, live test pending | auth.getUser() on server |
| User profiles and row-level security | Migration provided, deployment pending | SQL migrations 001 + 002 |
| Onboarding/settings | Implemented, live save test pending | Zod + Supabase server actions |
| Private file storage foundation | Migration provided, uploads blocked | Intentional lack of upload policy |
| Dashboard and responsive navigation | Implemented, build-verified | Authenticated app shell |
| Theme preference persistence | Implemented, live test pending | next-themes + stored profile |
| Supabase project config | Prepared | Public URL configured; local/host publishable key required |
| Unit tests | Tested | 7 passing in run #38297687890 |
| Typecheck/lint/build | Tested | All passed in run #38297687890 |
| Two-user database integration/E2E | Blocked | Requires separate Supabase staging project/accounts |
| German interface translation | Planned | English is the verified implementation language |
| Career Vault / Resume / Letters / Applications / Interviews | Planned | Not part of Prompt 1 |
| Data export, deletion, privacy compliance, notification delivery | Planned | Before public launch |

**Interpretation:** The milestone's GitHub code foundation is reviewable and compiles. The app is **not yet confirmed to run against the user's Supabase database**; migrations, authentication provider settings, two-user ownership tests and hosting still require authorized infrastructure access. Do not mark those features as tested until verified.
