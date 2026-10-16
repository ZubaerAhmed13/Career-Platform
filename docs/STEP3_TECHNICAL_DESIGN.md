# Step 3 — Resume Studio technical design

Status: merged in GitHub `main` via PR #6 (16 October 2026). By separately approved owner action, both additive migrations were applied to the connected CareerOS AI Supabase project and RLS/grants verified read-only. Source-level beta awaiting manual signed-in acceptance: no hosting or AI activation.

## Invariants
- Career Vault facts stay canonical and keep their IDs, categories, provenance, owner IDs, revisions and review status.
- Only confirmed Vault records are eligible for import. Selecting a fact copies its actual text and its source ID/revision metadata into a document-specific snapshot.
- A resume is a separately edited derivative. Resume-only wording never updates the underlying Vault.
- Version snapshots capture the entire document. Older resumes remain reproducible if source facts subsequently change or are deleted.
- New source references are owner-checked server-side. Existing stored source snapshots are intentionally retained, not silently updated.
- Every resume row is owner-scoped. Version relationships enforce the same owner through composite foreign keys, and RLS blocks foreign reads/writes.
- Full account deletion cascades resume drafts and versions. Explicit Career Vault *clearing* does not remove saved resumes; both the user-facing clear controls and account export explain this.

## Persistence and security
Additive migration: supabase/migrations/202610150001_resume_studio.sql. It creates resumes and resume_versions, SQL owner RLS policies and an authenticated, owner-scoped function to copy a locked draft into the immutable version table. Authenticated clients can only select history; they cannot directly insert, modify or delete historical rows.

Draft revisions are incremented by a trigger. Server actions update on (id, user_id, expected revision) to reject stale-tab overwrites. A conflict leaves local edits visible; the editor asks the user to compare or reload. The editor does not promise offline synchronisation.

JSONB rows are size-limited. Actions use Zod for content structure and URLs, and server-verified identity for ownership. No arbitrary HTML is rendered. The entire draft is snapshotted; version restore creates a new current draft and never edits the historical snapshot.

## Rendering and exports
Five CSS-based templates render the same typed model. The default is photo-free; optional portraits are cropped/compressed locally in the browser, included only when the owner requests them, and embedded in editable DOCX and printed outputs. Graduate layout shows education and projects first. Controls support section/entry/bullet ordering, display, typography, A4/Letter, controlled date formats and English or German built-in headings (not automatic text translation). The product UI remains English.

PDF is provided by the actual browser Print / Save as PDF flow; not a fake binary download. Paged print CSS is used, but browser differences and long-document pagination still require independent visual checks. DOCX is generated on-device as a genuine ZIP-based OOXML document with WordprocessingML paragraphs, styles, section dimensions and editable bullets, not HTML renamed as .docx. Plain text preserves logical reading order.

## Acceptance boundary
Unit, public Playwright, and disposable Postgres RLS tests run in PR CI. Authenticated sign-in/edit/relogin against the owner's real Supabase has not run and must not be claimed passed. The original additive migration and a least-privilege grant correction were subsequently applied to the owner-approved CareerOS AI project on 16 October 2026. The owner requested completion, and the reviewed source was merged without deploying. Do not deploy to Vercel or make further live Supabase changes without specific further approval.

## Resume Studio database grants

The initial Step 3 migration adds RLS and explicit application grants. In Supabase projects whose historical default privileges automatically grant all table permissions, those are additive rather than restrictive. Run the additive hardening migration `supabase/migrations/202610160001_resume_studio_least_privilege.sql` after the main Step 3 migration. It revokes all direct `anon` and `authenticated` table privileges from the two resume tables, then grants exactly the authenticated operations the app needs. The restricted version-creation RPC remains the only authenticated path to append a historical version, and `service_role` retains administrative access. Existing resume rows are not changed.


**Live verification:** Both migration entries were recorded as `resume_studio` and `resume_studio_least_privilege`. Supabase recorded generated migration versions; GitHub retains date-coded SQL filenames. If later using the Supabase CLI, reconcile migration history before `db push` to avoid attempting to reapply existing DDL. The tables were empty at initial verification; owner-authenticated CRUD/relogin is not yet verified.
