# Step 3 — Resume Studio acceptance

## Code and CI
- [ ] TypeScript, ESLint, unit tests, build, public browser tests pass
- [ ] Migrations apply to disposable PostgreSQL and RLS/versions/cascades are verified
- [ ] Anonymous Studio routes are private
- [ ] Create, rename, duplicate, delete, content/design editor, history and conflict recovery are implemented
- [ ] Five templates and live preview preserve content
- [ ] Genuine editable OOXML and plain text export, print/Save PDF
- [ ] Existing Step 1 and 2 CI remains passing

## Practical acceptance, postponed until owner-approved backend changes
- [ ] Apply additive SQL to an explicitly chosen backend, not during this PR
- [ ] Sign in, create resume, edit, reload and re-login
- [ ] Import approved Vault record and inspect its source revision
- [ ] Modify resume-only wording without changing Vault
- [ ] Save, preview, restore and export an older immutable version
- [ ] Dual-tab stale revision preserves local unsaved changes
- [ ] Open Word document and inspect bullets, editability and A4/Letter
- [ ] Inspect long multipage print/PDF and mobile keyboard editor
- [ ] Account export contains owned draft and immutable history

Never delete your only real account for testing. No preview deployment, live Supabase mutation or merge to main is authorised.
