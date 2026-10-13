-- Optimize composite foreign-key validation when deleting a parent record.
-- New database has no user rows, so these indexes do not rewrite career data.
create index if not exists career_links_from_owner_fk
 on public.career_links(from_record_id,user_id);
create index if not exists career_links_to_owner_fk
 on public.career_links(to_record_id,user_id);
create index if not exists career_evidence_links_record_owner_fk
 on public.career_evidence_links(record_id,user_id);
create index if not exists career_evidence_links_evidence_owner_fk
 on public.career_evidence_links(evidence_id,user_id);
create index if not exists career_messages_session_owner_fk
 on public.career_interview_messages(session_id,user_id);
create index if not exists career_suggestions_session_owner_fk
 on public.career_suggestions(session_id,user_id);
