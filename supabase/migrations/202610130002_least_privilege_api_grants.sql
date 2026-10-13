-- Explicit least-privilege Data API grants. RLS still applies to all allowed operations.
revoke all privileges on all tables in schema public from anon, authenticated;
grant select,insert,update on public.profiles to authenticated;
grant select,delete on public.file_metadata to authenticated;
grant select,insert,update,delete on public.career_records to authenticated;
grant select,insert,update,delete on public.career_evidence to authenticated;
grant select,insert,delete on public.career_links to authenticated;
grant select,insert,delete on public.career_evidence_links to authenticated;
grant select,insert,update,delete on public.career_interview_sessions to authenticated;
grant select,insert on public.career_interview_messages to authenticated;
grant select,insert,delete on public.career_suggestions to authenticated;
grant select on public.career_events to authenticated;
-- career_ai_usage has RLS and remains completely unavailable through normal clients.
-- Functions explicitly granted to authenticated continue working as intended.
