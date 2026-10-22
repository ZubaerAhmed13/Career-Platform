# Step 4 acceptance matrix — owner review

Pull request: https://github.com/ZubaerAhmed13/Career-Platform/pull/10
Branch: `feat/step4-advanced-resume-tailoring`

**Status:** Draft / unmerged / no deployment / live Supabase untouched.

| Acceptance gate | Implemented in PR | Validation path | Limitation |
|---|---|---|---|
| Private saved job description | Yes | PostgreSQL and synthetic REST CI | Live migration unapproved |
| First-saved original source text preserved | Yes | Trigger-based immutability | Working text remains user-editable |
| Requirement extraction/review | Yes | Vitest | English-first conservative line parsing |
| Essential/preferred/unclassified priorities | Yes | Vitest | User review for ambiguous text |
| Confirmed Vault evidence mapping | Yes | Vitest + owner checks | Curated aliases, not semantic AI |
| Transparent gap and coverage counts | Yes | Vitest | Counts documented evidence only |
| Independent targeted draft | Yes | Synthetic REST and manual flow required | Version choices load from owned immutable history |
| User-approved inclusion from Vault | Yes | Existing source guard and revision checks | Real signed-in interaction not verified |
| Content ordering & human editing | Reuses Step 3 | Existing editor tests | No independent Step 4 editor |
| Before-and-after comparison | Yes | Vitest | Text and structural changes, not PDF pixel diffs |
| Source revision alert | Yes | Vitest | No automatic source refresh |
| Version history and DOCX/PDF/text | Reuses Step 3 | Existing export/unit tests | Real print and DOCX visual fidelity acceptance open |
| Revision conflicts and safe deletion | Yes | PostgreSQL + synthetic REST CI | Multi-tab acceptance on real account open |
| Account JSON export | Yes | Owner filtered route | Verify live after explicitly approved migration |
| WCAG/mobile interaction | Responsive components | Existing public smoke only | Protected Step 4 browser test still needed |
| External AI calls and hosting disabled | Yes | Source audit | Model integration deferred |
| CI signoff | Pending | GitHub Actions PR #10 | Do not claim unrun suites passed |

## Owner acceptance after authorisation

1. Verify the connected project's migration history and obtain a backup before approving application of Step 4 migration.
2. Apply the new migration **only after separate explicit approval**; check RLS, grants, composite keys and private table access with disposable users.
3. Sign in, paste a real job posting, review requirements, edit one and let autosave complete; reload and confirm exact text and original preservation.
4. Confirm a matching Vault fact; test missing SAP and German A1 versus fluent German. Verify unreviewed facts are never counted as proof.
5. Clone a saved resume. Verify source CV is unchanged, user-approved fact inclusion works, and the target can be edited, saved, versioned and restored independently.
6. Print or save a PDF, download editable DOCX and text; review long-page formatting and no-photo/photo choices. Verify stale print cannot happen.
7. Confirm source-change warning, full comparison, stale-tab conflict, deletion that preserves both CVs, account export, and accessibility on narrow mobile and keyboard.
8. Perform two-account live RLS only with throwaway identities, never destructive testing on the main account.

The PR should remain draft unless all mandatory code-level checks pass and owner explicitly authorises merge. Real-account and live service acceptance are separate gates.

## Reliability follow-up — 22 October 2026

The existing Step 4 implementation received an additional evidence and browser-acceptance review on the same draft pull request.

- Resume comparisons now separately reveal contact-link changes, portrait and field visibility, section/entry visibility, bullet edits, professional summary visibility and document design settings.
- Editing a reviewed requirement's meaning automatically returns it to **candidate** until re-approved. Editing the underlying working job advert also invalidates prior approvals; the first-saved source advert remains immutable.
- Mandatory and preferred criteria are counted separately; a source sentence containing both priority types remains unclassified for human review.
- Language matching recognises explicit equivalent labels such as German/Deutsch and English/Englisch, but does not infer native speech from C2 or fluent speech from A1.
- Direct tool-activity matches no longer treat organisation names or unrelated action verbs as evidence of skill. These rule-based matches remain deliberately conservative, and no score predicts hiring.
- A development-only synthetic fixture (`/tailoring-fixture`) exercises the real Step 4 workspace with fictitious job details, career facts and resumes. Its saves never call Supabase; the route returns 404 outside development. Desktop/mobile Playwright now tests evidence counts, review changes, source-advert edits, comparison inspection and 320px navigation.
- Private routes for tailoring were added to anonymous-access smoke tests. Real signed-in acceptance remains separately required.

**Latest branch commit:** see the head of draft PR #10. GitHub CI should be checked for that exact commit; passing an earlier commit is not signoff for subsequent changes. Nothing here authorises a live migration, production account changes, a merge or deployment.


## Export fidelity and document identity follow-up — 22 October 2026

Further Step 4 work strengthened the existing Resume Studio export path rather than building a second document renderer:

- DOCX now uses distinct editable Word paragraph styles for ATS Classic, Modern Professional, Student & Graduate, European Clean and Executive Minimal, with template-specific accents, section treatments, heading alignment and name styles. It preserves genuine editable text and optional embedded JPEG portraits. Standard and compact Word margins are aligned more closely with the browser preview. **This is improved styling, not a claim of pixel-identical layout in Microsoft Word.**
- Independent parser tests open all five OOXML packages and verify editable text, Unicode, style distinctions, A4/Letter geometry, and optional portraits; final manual Microsoft Word/LibreOffice pagination and print fidelity are still open acceptance gates.
- Zod rejects duplicate section, entry and bullet IDs, preventing ambiguous document editing and structural comparisons.
- Before PDF, DOCX, and text export, the editor now validates the snapshot and offers a non-blocking review of missing visible contact methods, no visible career entries, long bullets and unsupported percentage achievements. Invalid documents are blocked from export; legitimate warnings can be accepted by the user.
- Numerical-claim review compares exact percentage values with the captured source description, rather than accepting any percentage as supporting a different one.
- Browser-level synthetic tests exercise both cancelling and accepting the DOCX pre-export confirmation, alongside unit tests for warnings and document validation.

These are GitHub-only code and synthetic CI changes. The live Step 4 Supabase migration is still **unapplied**. Authenticated user acceptance, true document visual review, and two-user staging security remain outstanding. Do not merge PR #10 or deploy before separate owner approval.

## Atomic targeted resume creation and evidence approval gate — 22 October 2026

To address a real failure mode in the original implementation, Step 4 now includes a **second additive migration**:
`supabase/migrations/202610160003_atomic_targeted_resume.sql`, to be applied after
`202610160002_resume_tailoring.sql`, and **only after explicit live-migration approval**.

- The `create_my_targeted_resume` PostgreSQL function checks the authenticated user, locks the owned job brief, verifies the expected revision, and creates and links exactly one independent targeted resume **in one transaction**.
- Concurrent tabs, cross-user references, duplicate submissions, and a changed current source revision reject the entire operation without leaving orphaned copies.
- User-chosen historical versions are copied from immutable version snapshots, not from the current source draft. Starting without a source resume is also supported using validated initial content.
- The function uses **security invoker** under the authenticated table permissions and row-level security. Anonymous access is denied.
- The job brief revision trigger now also rejects carrying approved criteria onto a changed source advert or editing an approved criterion's meaning while retaining its approval, including direct REST mutations.
- The workspace disables criterion approval while an edited advert remains unsaved and exposes a plain-language explanation.
- Disposable PostgreSQL and PostgREST tests cover owner isolation, source-version fidelity, clean blank creation, stale revision/source rollback, duplicates, immutable source baselines, and direct REST approval bypass attempts. Development-only browser tests check the review sequence.
- **No live database changes were made**. The current owner account, other accounts, source resumes and production data were not used for testing.

### Remaining external acceptance

These cannot be certified solely from GitHub code or synthetic test accounts: real signed-in creation and restoration, the owner's Supabase migration approval and backup, two real isolated staging identities, the full Word/PDF visual/pagination check, accessibility with assistive technologies, and end-to-end signed-in deletion/export. Keep PR #10 draft and hosting disabled until separately authorised.
