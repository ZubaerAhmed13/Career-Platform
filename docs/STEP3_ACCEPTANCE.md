# Step 3 — Resume Studio acceptance matrix

**Code milestone:** Merged into `main` via [PR #6](https://github.com/ZubaerAhmed13/Career-Platform/pull/6) on 16 October 2026.
**Operating mode:** GitHub-only code and no Vercel deployment. The owner explicitly approved the two additive CareerOS AI Supabase migrations on 16 October 2026; signed-in manual testing remains separate.

## Completed automated code-level checks

- [x] TypeScript, ESLint, Vitest and production Next build on the final PR commit
- [x] Additive migration applied in disposable CI PostgreSQL; source guard, owner RLS, immutable versions, optimistic revision and deletion cascades asserted
- [x] Anonymous Studio routes redirect to authentication
- [x] Library and editor source implemented, with development-only synthetic desktop/mobile browser interactions
- [x] Five template designs and content-independent switching validated in code
- [x] Genuine editable OOXML/DOCX inspected by an independent parser; text export and long A4/Letter browser PDF output tested
- [x] Existing Step 1/2 checks remained in the successful Step 3 PR validation

Successful exact-head PR CI: [38953206572](https://github.com/ZubaerAhmed13/Career-Platform/actions/runs/38953206572). Check post-merge `main` CI separately.

## Additional isolated authenticated HTTP regression checks

The GitHub-only acceptance job now exercises a genuine PostgREST HTTP API backed by a **disposable PostgreSQL fixture**, using two temporary synthetic JWT identities. It checks private create and re-read after a fresh token, owner isolation, source snapshot without Vault mutation, version creation and append-only history, revision conflict detection, restoration, owner-filtered draft/history data and cascade deletion. No Supabase service project is contacted. This is closer to real usage than SQL assertions alone, but **is not a substitute for real Auth sign-in/cookies, a deployed environment or manual user acceptance**.

## Outstanding real-account acceptance

- [x] Owner explicitly approved and applied the additive Resume Studio and least-privilege migrations to the connected CareerOS AI project; schema and permissions verified read-only on 16 October 2026
- [ ] Authenticate, create/edit a resume, refresh and sign back in; verify persistence
- [ ] Add confirmed Career Vault facts; verify copied source revision and original Vault immutability
- [ ] Create, preview, restore and export historical versions; simulate simultaneous edits
- [ ] Open a real exported DOCX in Word/LibreOffice and inspect portrait/no-photo cases, bullets and pagination
- [ ] Review long A4 and Letter browser-saved PDFs, logged-in mobile interaction and keyboard navigation
- [ ] Verify signed-in JSON account export includes the user's owned resumes and version history

**No irreversible deletion tests on the sole real account.** The CI suite uses disposable synthetic identities. The separate owner-approved live database migration is complete, but no Vercel deployment is authorised. Until signed-in practical acceptance is completed, Resume Studio is a tested source-level beta with prepared database storage, **not a manually verified live web feature**.
