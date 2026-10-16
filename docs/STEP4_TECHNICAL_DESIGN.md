# Step 4 — Evidence-first advanced resume tailoring

Status: **Draft PR #10** on `feat/step4-advanced-resume-tailoring`. NOT merged, NOT deployed, NOT applied to the connected live Supabase project.

## Integration and workflow

Start at `/resume-studio/tailor`: paste a real job description and save a private job brief. The exact first-saved source text is stored in an immutable field. The editable working text is stored separately. Suggested requirement lines are marked *candidate* and must be manually approved, modified or rejected. `/resume-studio/tailor/[id]` shows reviewed evidence coverage, recommended confirmed Career Vault facts, original vs targeted resume comparisons, explicit inclusion controls, and review warnings.

Step 4 is intentionally **deterministic**. It uses curated phrase aliases, exact field provenance, explicit priority markers and rules for ambiguous compound/alternative criteria. It is neither a language model nor an ATS/recruitment prediction. English adverts are the primary supported input. Extraction is neither exhaustive nor semantically complete; ambiguous job requirements require the user's review.

## Existing Step 3 integration

- Source resumes, confirmed Career Vault facts and immutable versions stay in their existing tables.
- Targeted copies are independent `resumes` rows, with full snapshot/template/portrait choices copied from a selected draft or selected immutable version (or a fresh blank document with account contact details prefilled).
- Job-specific metadata is stored in a private tailoring session, never printed in a CV by default.
- User-selected confirmed Vault records are inserted into a target using the existing `entryFromRecord` provenance data and optimistic resume revision guard.
- Source comparison preserves the exact captured document snapshot. It does not silently change if Career Vault source facts are edited or deleted.
- The normal Resume Studio editor remains responsible for free-form edits, ordering, versions, template settings, DOCX, text and browser-PDF exports.
- The print button in the Step 3 editor saves and verifies the latest changes before opening a persisted print view, rather than unknowingly printing an old draft.

## Persistence

Additive, **not live-applied** migration: `supabase/migrations/202610160002_resume_tailoring.sql`.

Table: `public.resume_tailoring_sessions`. User-specific fields: owner ID, job metadata and saved original description, immutable first-saved source text, notes, reviewed requirements JSONB, optional source and targeted resume relationships, captured source snapshot, source revision, optimistic row revision and timestamps.

New table has owner RLS and same-owner composite foreign keys. Grant select/insert/update/delete to authenticated; revoke anon and broad administrative table grants. Private job URL remains reference text; it is never fetched. Size and semantic validation is enforced in server actions using Zod; database checks provide additional bounds and shape checks. Immutable originals and comparison baselines are protected by trigger logic. Account JSON export includes the new table; authenticated full-account deletion cascades from `auth.users`. Deleting a job brief **retains both the original and independently tailored resumes**. Deleting a referenced resume clears that relationship without deleting the captured comparison snapshot.

## Matching, suggestions and honesty

Only confirmed career records are considered. Direct evidence requires controlled terminology AND conservative context (e.g., a documented 'used Excel' action or explicit recorded skill); related evidence is not counted as proven. Alternative/compound criteria are classified for user review. Advanced seniority, years, certification and fluency are not inferred from a general keyword. German A1 cannot satisfy a business-fluent German requirement. Unsupported requirements remain visible.

Suggestions name their exact underlying confirmed record and a reviewed criterion. User action is required to include the record. Guidance detects weak or verbose bullets, duplicate content, uncorroborated numbers and stale source revisions; it does not generate confident rewrites or fabricate measurable results.

## Conflict behaviour and privacy

Job brief autosaving debounces edits, refuses stale revisions and retains unsaved state after a failed save. Copy creation checks the session revision, inserts a new user-owned resume, and cleans it up if linking fails. Resume fact inclusion checks expected draft revision and confirmed record ownership. No service key, AI call, arbitrary URL fetching, third-party scraping or live data mutation is involved in this PR.

## Verification boundary

- Unit: requirement extraction, source retention invariants, categorisation, matching, gaps, recommendations, warnings and comparison.
- Disposable PostgreSQL: migration, grants, RLS, immutable source, owner foreign keys and deletion semantics.
- Synthetic PostgREST/JWT: fresh user-scoped loads, cross-owner denials, revision conflicts, independent targeted copy, source preservation and deletion.
- Existing CI: TypeScript, lint, Vitest, build, public browser smoke.

PR CI must finish successfully before code-level sign-off. Live Supabase migration and real signed-in/manual browser acceptance require distinct owner authorisation. No hosting is authorised.

## Deliberate limitations, pending future refinement

1. No generative narrative rewriting; unconfigured AI must remain disabled.
2. English-first line-based extraction and a curated vocabulary will miss requirements and may present related matches conservatively.
3. Existing Resume Studio handles detailed reordering and versions; this workspace does not reproduce the full editor.
4. True PDF page-count validation and template-specific editable DOCX layout fidelity require independent rendering comparisons.
5. Full authenticated desktop/mobile UX, keyboard/screen-reader interaction and two-account live Supabase testing have not been performed. Passing synthetic CI is not real-account acceptance.
6. Advanced Job Description Intelligence, cover letters, applications, interview preparation and job discovery belong to later roadmap milestones.
