# CareerOS — current GitHub status

**Last reviewed:** 16 October 2026. **Operating mode:** GitHub-only development; hosting paused by owner decision. No model server, scanning gateway or Vercel preview is required for Step 2. The last verified Step 2 merge on `main` was `163735a` (PR #4); the original Vault merged in PR #2 and export reliability improvements in PR #3.

## Merged in `main`
- Eight career record categories with authenticated create, edit, delete, evidence and relationships.
- Explicit review, correction, approval, rejection and selected-field merge of imported proposals.
- Browser-local PDF/DOCX text extraction (2 MiB file size; text-based PDFs at most 12 pages), leaving original document bytes on the device.
- Supabase-owned, RLS-protected career data, review history, owner-filtered JSON export and confirmation-gated erasure code.
- CI scripts for TypeScript, lint, unit, PostgreSQL migration/RLS and public desktop/mobile browser smoke.
- English-only UI. AI adapter and optional hosted scanner code retained but not activated.

## Step 2 polish merged in [PR #4](https://github.com/ZubaerAhmed13/Career-Platform/pull/4) on 15 October 2026
- Category-specific optional structured form inputs, stored in existing record `details` without migrations or rewriting provenance.
- Browser-local full-CV multi-part text review, deliberate per-part save, progress and refusal to silently omit detected proposals.
- Additional deterministic test coverage, reproducible npm lockfile, CI switched to `npm ci`, and updated documentation.
- Branch CI passed at `95ddc719` before squash merge to `main` at `163735a`. This confirms code-level validation, not real-account acceptance.

## Verification boundaries
- No real-account create/edit/reload/delete acceptance run has been independently recorded for the latest PR.
- Browser-local document extraction was covered by existing browser test fixtures. It is **not antivirus scanning**; image-only PDF OCR is unavailable.
- True two-account Supabase staging tests and destructive account erasure are available as opt-in workflows for disposable accounts only; standard PR CI does not execute them.
- Confirming that an application builds is not confirming working sign-in, database persistence or mobile ergonomics with a real account.
- The hosted Qwen/Ollama model and ClamAV gateway remain deferred; do not report the model as active.
- No GitHub-only task may trigger Vercel or alter the live Supabase project.

## Safe next steps
1. Step 2 and Step 3 source code are merged; verify CI from the exact main merge commit, not from earlier feature-branch runs.
2. Before attempting real signed-in Resume Studio usage, intentionally apply the Step 3 SQL migration to a separately approved database. This was **not** part of GitHub-only implementation.
3. Use non-sensitive disposable resumes for create/edit/reload/relogin and owned record tests, then check Word/PDF exports and account JSON backup; avoid irreversible actions on the only real account.
4. Keep automatic Vercel deployment off, preserve English-language navigation, and leave AI/model hosting deferred.

See `docs/STEP2_ACCEPTANCE_MATRIX.md`, `docs/STEP2_RELEASE_GATES.md`, and `docs/BROWSER_LOCAL_CV_IMPORT.md`. Historical reports under `docs/` document earlier snapshots; their old branching, preview and AI requirements do **not** supersede these current operating instructions.

## Step 3 — Resume Studio merged into main, not deployed

[PR #6](https://github.com/ZubaerAhmed13/Career-Platform/pull/6) merged the non-AI Resume Studio source on 16 October 2026: eight career categories, five responsive templates, optional local portrait processing, owner-scoped document snapshots, versioned drafts, print/PDF, editable DOCX, text output and automated browser/database checks.

**Scope boundary:** Database migration committed in GitHub only — **not applied to live Supabase**. Real-account end-to-end acceptance is **not completed**. Hosting and AI are still disabled. See `docs/STEP3_ACCEPTANCE.md`.
