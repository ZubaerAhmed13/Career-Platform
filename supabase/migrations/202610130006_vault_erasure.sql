-- Optional owner-initiated Career Vault erasure. Never delete auth account or
-- profile; a separate account deletion workflow may be required by policy.
create function public.clear_my_career_vault()
returns boolean
language plpgsql security definer set search_path=''
as $$
declare person uuid;
begin
 person:=(select auth.uid());
 if person is null then
  raise exception 'Authentication required';
 end if;
 -- Serialize simultaneous purge attempts for this user. Every row affected
 -- below is scoped to the authenticated subject, not a browser-provided ID.
 perform pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended('career-vault-purge:'||person::text,0)
 );
 delete from public.career_evidence_links where user_id=person;
 delete from public.career_links where user_id=person;
 delete from public.career_suggestions where user_id=person;
 delete from public.career_interview_messages where user_id=person;
 delete from public.career_interview_sessions where user_id=person;
 delete from public.career_evidence where user_id=person;
 delete from public.career_records where user_id=person;
 -- Record deletion may create audit entries, so clear audit LAST.
 delete from public.career_events where user_id=person;
 delete from public.career_ai_usage where user_id=person;
 return true;
end; $$;
revoke all on function public.clear_my_career_vault() from public,anon;
grant execute on function public.clear_my_career_vault() to authenticated;
