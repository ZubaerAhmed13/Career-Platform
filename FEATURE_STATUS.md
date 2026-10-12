# Feature status — Milestone 1

| Feature | Status | Evidence / blocker |
|---|---|---|
| Landing page and planned-module states | Implemented (unverified runtime) | Next.js routes |
| Email/password registration and login | Implemented (unverified live) | Supabase SSR server actions; project URL provided |
| Confirmation callback and recovery | Implemented (unverified live) | Auth routes; email config required |
| Private route guards | Implemented (unverified live) | server auth.getUser() |
| User profile and RLS migrations | Implemented (not applied/verified) | SQL migration committed; Supabase connection required |
| Onboarding and settings | Implemented (unverified live) | Profile form and actions |
| Private storage foundation | Implemented (uploads blocked) | Migration; bucket creation not verified |
| Responsive shell/dashboard | Implemented | React/semantic CSS |
| Theme selector | Implemented | next-themes + saved profile preference |
| Supabase client configuration | Implemented (deployment env pending) | Project URL + publishable key environment name |
| Complete German UI translations | Planned | not implemented |
| Automated unit tests | Implemented (verification pending) | tests/profile.test.ts |
| Multi-user integration/E2E security | Blocked | requires connected Supabase test project |
| Resume/Cover letters/Job tracker/Interviews | Planned | intentionally unavailable |
| Data export/deletion, notification delivery | Planned | public-launch blocker |
