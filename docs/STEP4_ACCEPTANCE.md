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
| Independent targeted draft | Yes | Synthetic REST and manual flow required | Saved version selection not exposed in tailoring wizard |
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
