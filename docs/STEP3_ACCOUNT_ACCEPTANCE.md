# Step 3 Resume Studio — safe account acceptance

**Current status:** The Step 3 code is on GitHub main. The additive migration is in the repository, not on the connected CareerOS Supabase project. Hosting and model serving remain paused.

## Prerequisites
1. Explicitly approve the target **CareerOS AI** Supabase project. Do not use Weekwise or DocFlow.
2. Review the additive SQL migration at supabase/migrations/202610150001_resume_studio.sql. Confirm disposable PostgreSQL and synthetic REST security tests are green.
3. Check a current backup and migration history. Only after separate owner approval, apply the migration. Never rerun it blindly on a database with existing resume tables.
4. Verify the newly created private resume and version tables, RLS policies and authenticated owner grants.
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
