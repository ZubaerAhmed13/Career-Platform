-- Protect AI provenance even when an owner calls PostgREST directly.
-- Apply after 003–006. Server-side AI writes require a service-role token.
drop policy if exists "messages own insert" on public.career_interview_messages;
create policy "users write only their own answers" on public.career_interview_messages
 for insert to authenticated
 with check (user_id=(select auth.uid()) and role='user');

drop policy if exists "suggestions own insert" on public.career_suggestions;
create policy "users stage their own pasted text only" on public.career_suggestions
 for insert to authenticated
 with check (
   user_id=(select auth.uid()) and review_status='pending'
   and origin='cv_import' and session_id is null
 );

-- One server-authorized database transaction for an AI answer and all pending
-- proposals. The caller's JWT MUST bear the service_role claim.
create function public.persist_verified_ai_interview(
  target_user_id uuid,
  target_session_id uuid,
  ai_reply text,
  proposals jsonb
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
 item jsonb;
 last_answer text;
begin
 if (select auth.role()) is distinct from 'service_role' then
   raise exception 'Trusted AI service authorization required';
 end if;
 if ai_reply is null or char_length(trim(ai_reply)) not between 1 and 1800 then
   raise exception 'Invalid interview response';
 end if;
 if jsonb_typeof(proposals) is distinct from 'array'
    or jsonb_array_length(proposals)>2 then
   raise exception 'Invalid proposal payload';
 end if;
 perform 1 from public.career_interview_sessions
  where id=target_session_id and user_id=target_user_id and status='active'
  for update;
 if not found then raise exception 'No active interview for this user'; end if;

 select content into last_answer from public.career_interview_messages
 where user_id=target_user_id and session_id=target_session_id and role='user'
 order by created_at desc,id desc limit 1;
 if last_answer is null then raise exception 'No user answer to interview'; end if;

 for item in select value from jsonb_array_elements(proposals) loop
   if jsonb_typeof(item) is distinct from 'object'
      or item->>'kind' not in ('experience','education','skill','language','project','achievement','certification','volunteering')
      or char_length(trim(coalesce(item->>'title',''))) not between 1 and 180
      or char_length(coalesce(item->>'description',''))>4000
      or char_length(coalesce(item->>'evidence_quote','')) not between 6 and 2000
      or position(item->>'evidence_quote' in last_answer)=0 then
     raise exception 'AI proposal lacks verified user-answer evidence';
   end if;
 end loop;

 insert into public.career_interview_messages(user_id,session_id,role,content)
 values(target_user_id,target_session_id,'assistant',ai_reply);

 insert into public.career_suggestions(
   user_id,session_id,kind,title,description,evidence_quote,origin,review_status
 )
 select target_user_id,target_session_id,
  item->>'kind',trim(item->>'title'),
  coalesce(item->>'description',''),
  item->>'evidence_quote','ai','pending'
 from jsonb_array_elements(proposals) as item;

 update public.career_interview_sessions set updated_at=now()
 where id=target_session_id and user_id=target_user_id;
 return true;
end; $$;

revoke all on function public.persist_verified_ai_interview(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.persist_verified_ai_interview(uuid,uuid,text,jsonb) to service_role;
