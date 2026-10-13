-- One AI response per exact user answer. Versioned RPC avoids race-prone
-- "most recent user answer" matching and duplicate responses.
alter table public.career_interview_messages
  add column if not exists reply_to_user_message_id uuid,
  add column if not exists next_focus text
  check (next_focus is null or next_focus in ('context','responsibility','action','outcome','evidence'));

create unique index if not exists career_interview_one_ai_reply_per_answer
  on public.career_interview_messages(reply_to_user_message_id)
  where reply_to_user_message_id is not null;

-- Retire the older ambiguous service function; only V2 is privileged.
revoke all on function public.persist_verified_ai_interview(uuid,uuid,text,jsonb)
  from public,anon,authenticated,service_role;

create function public.persist_verified_ai_interview_turn(
  target_user_id uuid,
  target_session_id uuid,
  target_user_message_id uuid,
  ai_reply text,
  next_question_focus text,
  proposals jsonb
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  latest_id uuid;
  latest_role text;
  latest_content text;
  item jsonb;
begin
  if (select auth.role()) is distinct from 'service_role' then
    raise exception 'Trusted CareerOS AI service authorization required';
  end if;
  if target_user_id is null or target_session_id is null or target_user_message_id is null
    or ai_reply is null or char_length(trim(ai_reply)) not between 1 and 1800
    or next_question_focus not in ('context','responsibility','action','outcome','evidence')
    or jsonb_typeof(proposals) is distinct from 'array'
    or jsonb_array_length(proposals)>2
  then raise exception 'Invalid interview response payload'; end if;

  perform 1 from public.career_interview_sessions
    where id=target_session_id and user_id=target_user_id and status='active'
    for update;
  if not found then raise exception 'Interview is no longer active'; end if;

  -- Serialize all provider writes within this session. The answer MUST be
  -- the current last message, not an earlier answer from a competing request.
  select id,role,content into latest_id,latest_role,latest_content
    from public.career_interview_messages
    where session_id=target_session_id and user_id=target_user_id
    order by created_at desc,id desc limit 1;
  if latest_id is distinct from target_user_message_id or latest_role <> 'user'
  then raise exception 'Stale or previously answered interview turn'; end if;

  for item in select entry.value from jsonb_array_elements(proposals) as entry(value) loop
    if jsonb_typeof(item) is distinct from 'object'
      or item->>'kind' not in ('experience','education','skill','language','project','achievement','certification','volunteering')
      or char_length(trim(coalesce(item->>'title',''))) not between 1 and 180
      or char_length(coalesce(item->>'description',''))>4000
      or char_length(coalesce(item->>'evidence_quote','')) not between 6 and 2000
      or position((item->>'evidence_quote') in latest_content)=0
    then raise exception 'Interview suggestion is unsupported by this answer'; end if;
  end loop;

  insert into public.career_interview_messages(
    user_id,session_id,role,content,reply_to_user_message_id,next_focus
  ) values (
    target_user_id,target_session_id,'assistant',ai_reply,target_user_message_id,next_question_focus
  );

  insert into public.career_suggestions(
    user_id,session_id,kind,title,description,evidence_quote,origin,review_status
  )
  select target_user_id,target_session_id,
    entry.value->>'kind',trim(entry.value->>'title'),
    coalesce(entry.value->>'description',''),
    entry.value->>'evidence_quote','ai','pending'
  from jsonb_array_elements(proposals) as entry(value);

  update public.career_interview_sessions set updated_at=now()
    where id=target_session_id and user_id=target_user_id;
  return true;
end; $$;
revoke all on function public.persist_verified_ai_interview_turn(uuid,uuid,uuid,text,text,jsonb)
 from public,anon,authenticated;
grant execute on function public.persist_verified_ai_interview_turn(uuid,uuid,uuid,text,text,jsonb)
 to service_role;
