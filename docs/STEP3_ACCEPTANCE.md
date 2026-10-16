# Step 3 — Resume Studio acceptance matrix

**Code milestone:** Merged into `main` via [PR #6](https://github.com/ZubaerAhmed13/Career-Platform/pull/6) on 16 October 2026.
**Operating mode:** GitHub only. Automatic Vercel deployment is disabled. No live Supabase schema mutations.

## Completed automated code-level checks

- [x] TypeScript, ESLint, Vitest and production Next build on the final PR commit
- [x] Additive migration applied in disposable CI PostgreSQL; source guard, owner RLS, immutable versions, optimistic revision and deletion cascades asserted
- [x] Anonymous Studio routes redirect to authentication
- [x] Library and editor source implemented, with development-only synthetic desktop/mobile browser interactions
- [x] Five template designs and content-independent switching validated in code
- [x] Genuine editable OOXML/DOCX inspected by an independent parser; text export and long A4/Letter browser PDF output tested
- [x] Existing Step 1/2 checks remained in the successful Step 3 PR validation

Successful exact-head PR CI: [38953206572](https://github.com/ZubaerAhmed13/Career-Platform/actions/runs/38953206572). Check post-merge `main` CI separately.

## Outstanding real-account acceptance

- [ ] Approve a non-production backend or deliberately approve applying `supabase/migrations/202610150001_resume_studio.sql` to the chosen Supabase project
- [ ] Authenticate, create/edit a resume, refresh and sign back in; verify persistence
- [ ] Add confirmed Career Vault facts; verify copied source revision and original Vault immutability
- [ ] Create, preview, restore and export historical versions; simulate simultaneous edits
- [ ] Open a real exported DOCX in Word/LibreOffice and inspect portrait/no-photo cases, bullets and pagination
- [ ] Review long A4 and Letter browser-saved PDFs, logged-in mobile interaction and keyboard navigation
- [ ] Verify signed-in JSON account export includes the user's owned resumes and version history

**No irreversible deletion tests on the sole real account.** The CI suite uses disposable synthetic identities. No Vercel deployment or live data mutation is authorised by this merge. Until the approved database migration and practical acceptance are completed, Resume Studio is a source-level beta, **not a live feature**.
