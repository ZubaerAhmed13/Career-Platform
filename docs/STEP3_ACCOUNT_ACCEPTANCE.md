# Step 3 Resume Studio — safe account acceptance

**Current status (16 October 2026):** The Step 3 code is merged on GitHub main. By explicit owner approval, the original Resume Studio migration and the least-privilege hardening migration were applied successfully to the connected CareerOS AI Supabase project. Tables, RLS, role grants and migration history passed read-only inspection. **Real sign-in and CV persistence have not been manually tested.** Hosting and model serving remain paused.

## Prerequisites
1. Target confirmed and owner-approved: **CareerOS AI** Supabase project, not Weekwise or DocFlow.
2. The additive SQL migration in supabase/migrations/202610150001_resume_studio.sql and follow-up supabase/migrations/202610160001_resume_studio_least_privilege.sql were applied on 16 October 2026. Disposable PostgreSQL and synthetic REST security tests are green.
3. The live migration history confirms resume_studio and resume_studio_least_privilege. Do not apply either again blindly. Backup availability was not independently established here; take a verified backup before any future destructive operation.
4. Verified: both private resume tables exist, RLS is enabled, owner policies are present, anonymous table grants are revoked, authenticated clients can write only drafts and read history, and the version-creation RPC is available only to authenticated users.
5. Configure local development with a publishable key in an untracked .env.local file. Run npm ci and npm run dev, then open http://localhost:3000. Do not expose a service-role key or deploy the site.

## Disposable resume acceptance procedure
- Sign in on the local site and create a CV with synthetic text. Save it, refresh the page, sign out and sign back in, verifying content persistence.
- Include a confirmed Career Vault record and check its source revision. Edit the CV copy only and verify the original Vault record is unchanged.
- Create a labelled historical version, change the draft and restore the earlier version. Verify history itself was not modified.
- Open two browser tabs, edit the same CV and verify stale-tab conflict handling without losing local edits.
- Try all templates, an optional browser-processed portrait and no-photo output. Open DOCX in Word and inspect A4/Letter PDF results; confirm selectable text and multipage layout.
- Check Settings JSON account export includes both resume drafts and history.
- Repeat mobile and keyboard checks using disposable data. Never test irreversible deletion on the only real account.

## Limits and recovery
Isolated authenticated REST tests use temporary synthetic JWT identities, not Supabase Auth cookies or the actual user account. Browser tests are also synthetic. Neither demonstrates real signed-in persistence or formal accessibility compliance. If setup is incomplete, the Resume Studio error boundary gives a safe retry rather than falsely showing an empty library. Inspect migration status read-only before changing anything.
