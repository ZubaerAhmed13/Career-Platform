# Testing checklist (record real execution only)

**Not executed in this environment:** npm dependency installation, typecheck, lint, Vitest, production build and end-to-end tests. Local development environment cannot reach package registries. GitHub Actions is configured to perform typecheck/lint/unit/build on PRs; inspect the actual run before declaring success.

**Required staging checks:** create two accounts; verify signup/confirmation/login/reset/logout; confirm private pages redirect without session; set profile, reload and sign back in; verify User A cannot SELECT/UPDATE/INSERT as B; verify no anonymous profile reads; check storage bucket is private and client upload disallowed; test desktop/mobile keyboard navigation, light/dark mode, invalid inputs and expired tokens; confirm frontend bundles contain no private credentials. Record dates, run URLs and results when executed.
