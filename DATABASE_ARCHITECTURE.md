# Database architecture

**Implemented in migration 202610120001_initial.sql:** auth.users (Supabase-managed), public.profiles (1:1 UUID owner), public.file_metadata (owner-scoped and reserved for later use), and private storage bucket career-private. Database RLS enforces auth.uid() = owner for profile reads/writes and metadata reads/creates/deletes. Storage object read policy restricts to first folder = authenticated UUID; no upload policy is granted. Auth trigger initializes a profile on account creation. Database trigger maintains updated_at.

**Not yet implemented:** CareerProfiles, Experiences, EducationRecords, Skills, Projects, CareerFacts, EvidenceSources, Resumes, ResumeVersions, CoverLetters, CoverLetterVersions, SavedJobs, JobRequirements, Applications, ApplicationEvents, ApplicationDocuments, InterviewSessions, InterviewQuestions, InterviewFeedback, NotificationPreferences and AuditEvents.

**Migration policy:** never manually edit production tables without a reviewed migration. Test policies using two real authenticated users before rollout; RLS alone does not substitute for application-side identity verification. Reserved file metadata must not be mistaken for a working document manager.

## New migrations proposed in Milestone 2 (NOT APPLIED BY THIS GITHUB CHANGE)
- `202610120003_career_vault.sql`: `career_records`, `career_evidence`, `career_links`, `career_evidence_links`, `career_suggestions`, `career_interview_sessions`, `career_interview_messages`, and `career_events`.
- `202610120004_career_suggestion_review.sql`: drops direct suggestion update policy, introduces authenticated atomic approval/rejection functions.

Every table has its own RLS policies scoped to `auth.uid()`. Composite foreign keys on `(id,user_id)` enforce cross-owner isolation even when malicious requests swap referenced UUIDs. Revision trigger handles optimistic edits; record triggers log create/update/delete for owner-only audit reads. Relationship rows cascade when an owned record is deleted, leaving unrelated records and standalone evidence untouched. Interview suggestions remain pending until approved. SQL is not claimed deployed: review actual migration history, backup and credentials before applying anything.

- `202610120005_suggestion_conflicts.sql`: authenticated, transactional user review functions to edit pending suggestions and merge selected title/description fields with revision checks.

- `202610120006_ai_usage_limits.sql`: RLS-protected `career_ai_usage` quota buckets with a SECURITY DEFINER `claim_career_ai_quota()` RPC. The server invokes it before each AI request; quotas are per authenticated account. Database not yet deployed.

- `202610120007_ai_provenance.sql`: narrows authenticated message/suggestion inserts, adds service-role-only atomic interview persistence RPC, and allows owned suggestion deletion.
- `202610120008_verified_cv_and_urls.sql`: service-role-only AI-origin CV suggestion persistence, and non-destructive HTTP(S) evidence source-URL CHECK constraint (NOT VALID until existing rows are audited).
