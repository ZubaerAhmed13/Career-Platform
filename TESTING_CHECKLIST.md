# Testing checklist (record real execution only)

2026-10-12 first GitHub CI run #38294023211: dependency install PASSED; typecheck FAILED on implicit-any Supabase SSR cookie callbacks; lint/test/build were SKIPPED. The callbacks were subsequently typed and pushed for a new CI validation; **do not claim these tests passed until a new workflow run confirms it**.

**Required staging checks:** create two accounts; verify signup/confirmation/login/reset/logout; confirm private pages redirect without session; save profile, reload and sign back in; verify User A cannot SELECT/UPDATE/INSERT as B; verify no anonymous profile reads; check storage bucket private and upload disallowed; test mobile keyboard navigation, light/dark mode, invalid inputs and expired tokens; confirm frontend bundles contain no private credentials. Record dates, run URLs and results when executed.

CI uses a dummy publishable key because compilation does not require live Supabase credentials. Live authentication/integration is **not tested by CI**.

2026-10-12 run #38294969904: dependency installation and typecheck PASSED; lint FAILED on a raw internal <a> element in the profile form; tests/build SKIPPED. Replaced with Next.js Link, pending new CI results.
