# Database architecture

**Implemented in migration 202610120001_initial.sql:** auth.users (Supabase-managed), public.profiles (1:1 UUID owner), public.file_metadata (owner-scoped and reserved for later use), and private storage bucket career-private. Database RLS enforces auth.uid() = owner for profile reads/writes and metadata reads/creates/deletes. Storage object read policy restricts to first folder = authenticated UUID; no upload policy is granted. Auth trigger initializes a profile on account creation. Database trigger maintains updated_at.

**Not yet implemented:** CareerProfiles, Experiences, EducationRecords, Skills, Projects, CareerFacts, EvidenceSources, Resumes, ResumeVersions, CoverLetters, CoverLetterVersions, SavedJobs, JobRequirements, Applications, ApplicationEvents, ApplicationDocuments, InterviewSessions, InterviewQuestions, InterviewFeedback, NotificationPreferences and AuditEvents.

**Migration policy:** never manually edit production tables without a reviewed migration. Test policies using two real authenticated users before rollout; RLS alone does not substitute for application-side identity verification. Reserved file metadata must not be mistaken for a working document manager.
