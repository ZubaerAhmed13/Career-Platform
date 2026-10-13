\set ON_ERROR_STOP on
-- Local SQL tests only, not a substitute for hosted Supabase Auth tests.
insert into auth.users(id,email) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','a@example.invalid'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','b@example.invalid');
grant select,insert,update,delete on all tables in schema public to authenticated,anon;
set role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
select set_config('request.jwt.claim.role','authenticated',false);
insert into public.career_records(id,user_id,kind,title)
 values('11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','experience','Staging working student');
do $$
declare blocked boolean;
begin
 blocked:=false;
 begin
  insert into public.career_records(user_id,kind,title,source)
   values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','skill','Forged AI','ai');
 exception when others then blocked:=true; end;
 if not blocked then raise exception 'Browser may forge source=ai'; end if;
 blocked:=false;
 begin
  update public.career_records set source='ai'
   where id='11111111-1111-4111-8111-111111111111';
 exception when others then blocked:=true; end;
 if not blocked then raise exception 'Browser changed provenance'; end if;
 blocked:=false;
 begin
  insert into public.career_suggestions(user_id,kind,title,origin)
   values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','skill','Fake provider','ai');
 exception when others then blocked:=true; end;
 if not blocked then raise exception 'Browser forged model suggestion'; end if;
end $$;
insert into public.career_interview_sessions(id,user_id,title)
 values('33333333-3333-4333-8333-333333333333',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Test session');
insert into public.career_interview_messages(user_id,session_id,role,content)
 values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '33333333-3333-4333-8333-333333333333','user',
 'I used SQL reporting during my internship.');
do $$
declare blocked boolean:=false;
begin
 begin
  insert into public.career_interview_messages(user_id,session_id,role,content)
  values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '33333333-3333-4333-8333-333333333333','assistant','Fake assistant');
 exception when others then blocked:=true; end;
 if not blocked then raise exception 'Browser forged assistant message'; end if;
end $$;
select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',false);
insert into public.career_records(id,user_id,kind,title)
 values('22222222-2222-4222-8222-222222222222',
 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','project','Other user project');
do $$
declare total integer; blocked boolean:=false;
begin
 select count(*) into total from public.career_records
 where id='11111111-1111-4111-8111-111111111111';
 if total<>0 then raise exception 'Cross-owner read permitted'; end if;
 begin
  insert into public.career_links(user_id,from_record_id,to_record_id,relation)
  values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  '22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111','related');
 exception when others then blocked:=true; end;
 if not blocked then raise exception 'Cross-owner link inserted'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.role','service_role',false);
select public.persist_verified_ai_interview(
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '33333333-3333-4333-8333-333333333333',
 'What kind of reports did you build?',
 '[{"kind":"skill","title":"SQL reporting","description":"Used SQL in an internship.","evidence_quote":"used SQL reporting"}]'::jsonb
);
select public.persist_verified_ai_cv_suggestions(
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'I used Excel to track inventory accurately at my employer.',
 '[{"kind":"skill","title":"Excel","description":"Used Excel for inventory","evidence_quote":"used Excel to track inventory"}]'::jsonb
);
set role authenticated;
select set_config('request.jwt.claim.role','authenticated',false);
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
do $$
declare answers integer; proposed integer;
begin
 select count(*) into answers from public.career_interview_messages
 where session_id='33333333-3333-4333-8333-333333333333'
 and role='assistant';
 select count(*) into proposed from public.career_suggestions
 where session_id='33333333-3333-4333-8333-333333333333'
 and origin='ai' and review_status='pending';
 if answers<>1 or proposed<>1 then
  raise exception 'AI transaction failed: % responses and % suggestions',answers,proposed;
 end if;
end $$;
insert into public.career_suggestions(id,user_id,kind,title,origin,description)
 values('44444444-4444-4444-8444-444444444444',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'project','Approved SQL project','cv_import','A genuine project');
select public.approve_career_suggestion('44444444-4444-4444-8444-444444444444');
do $$
declare count_confirmed integer;
begin
 select count(*) into count_confirmed from public.career_records
 where user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
 and source='import' and status='confirmed' and title='Approved SQL project';
 if count_confirmed<>1 then raise exception 'Approval failed'; end if;
end $$;
reset role;

-- Assert non-interview AI proposals are stored as pending, never confirmed.
do $$
declare extracted_count integer;
begin
 select count(*) into extracted_count from public.career_suggestions
 where user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
 and origin='ai' and session_id is null
 and title='Excel' and review_status='pending';
 if extracted_count<>1 then raise exception 'Verified CV extraction did not persist pending data'; end if;
end $$;
-- Concurrent-safe, database-backed per-account quotas.
select public.claim_career_ai_quota();
select public.claim_career_ai_quota();
select public.claim_career_ai_quota();
select public.claim_career_ai_quota();
do $$
declare blocked boolean:=false;
begin
 begin
  perform public.claim_career_ai_quota();
 exception when others then blocked:=true; end;
 if not blocked then raise exception 'AI request was not quota-limited'; end if;
end $$;
reset role;

-- Duplicate reviews must fail safely unless owner deliberately approves separately.
set role authenticated;
select set_config('request.jwt.claim.role','authenticated',false);
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
insert into public.career_suggestions(id,user_id,kind,title,origin,description)
 values('55555555-5555-4555-8555-555555555555',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'project','Approved SQL project','cv_import','A distinct project with the same title');
do $$
declare blocked boolean:=false;
begin
 begin
  perform public.approve_career_suggestion('55555555-5555-4555-8555-555555555555');
 exception when others then blocked:=true; end;
 if not blocked then raise exception 'Accidental duplicate approval was accepted'; end if;
end $$;
select public.approve_career_suggestion_separately('55555555-5555-4555-8555-555555555555');
do $$
declare total integer;
begin
 select count(*) into total from public.career_records
 where user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
 and kind='project' and title='Approved SQL project';
 if total<>2 then raise exception 'Explicit separate review failed'; end if;
end $$;
select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',false);
do $$
declare blocked boolean:=false;
begin
 begin
  perform public.approve_career_suggestion_separately('44444444-4444-4444-8444-444444444444');
 exception when others then blocked:=true; end;
 if not blocked then raise exception 'Other account was permitted to reapprove a suggestion'; end if;
end $$;
reset role;
