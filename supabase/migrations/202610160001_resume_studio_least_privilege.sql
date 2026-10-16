-- Step 3 least-privilege addendum for Supabase default PUBLIC schema grants.
-- No data changes; all changes are confined to the two new resume tables.
-- Supabase project default grants can include anon and authenticated ALL,
-- even when the initial migration grants only the intended operations.
revoke all privileges on table public.resumes, public.resume_versions from anon, authenticated;
grant select, insert, update, delete on table public.resumes to authenticated;
grant select on table public.resume_versions to authenticated;
-- service_role retains Supabase administrative access; owner row security stays enabled.
