\set ON_ERROR_STOP on
-- Step 4 only on disposable CI PostgreSQL, never the linked Supabase project.
do $$
begin
 if has_table_privilege('anon','public.resume_tailoring_sessions','SELECT') or
    has_table_privilege('anon','public.resume_tailoring_sessions','INSERT') or
    has_table_privilege('authenticated','public.resume_tailoring_sessions','TRUNCATE') or
    has_table_privilege('authenticated','public.resume_tailoring_sessions','TRIGGER') then
  raise exception 'Tailoring table privileges exceed least privilege'; end if;
 if not (select relrowsecurity from pg_class where oid='public.resume_tailoring_sessions'::regclass) then
  raise exception 'Tailoring table RLS is disabled'; end if;
 if has_function_privilege('authenticated','public.tailoring_revision_guard()','EXECUTE') then
  raise exception 'Internal trigger function exposed'; end if;
end $$;
insert into auth.users(id,email) values
 ('abababab-abab-4aba-8aba-abababababab','tailor-a@example.invalid'),
 ('cdcdcdcd-cdcd-4cdc-8cdc-cdcdcdcdcdcd','tailor-b@example.invalid');
set role authenticated;
select set_config('request.jwt.claim.sub','abababab-abab-4aba-8aba-abababababab',false);
select set_config('request.jwt.claim.role','authenticated',false);
insert into public.resumes(id,user_id,name,draft_content,template_id,paper_size,document_language)
values ('babbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','abababab-abab-4aba-8aba-abababababab',
 'Base CV','{"schemaVersion":1}'::jsonb,'ats-classic','A4','en');
insert into public.resume_tailoring_sessions
 (id,user_id,job_title,original_job_description,requirements,source_resume_id,source_resume_revision,source_snapshot)
values ('aaaaaaaa-1111-4111-8111-111111111111',
 'abababab-abab-4aba-8aba-abababababab','Example Analyst',
 'Experience with Microsoft Excel and reporting required. Good teamwork is desirable.',
 '[]'::jsonb,'babbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',1,'{"schemaVersion":1}'::jsonb);
update public.resume_tailoring_sessions set private_notes='Reviewed by A'
 where id='aaaaaaaa-1111-4111-8111-111111111111' and revision=1;
do $$
declare current_rev integer;rejected boolean:=false;
begin
 select revision into current_rev from public.resume_tailoring_sessions
 where id='aaaaaaaa-1111-4111-8111-111111111111';
 if current_rev<>2 then raise exception 'Tailoring revision failed';end if;
 begin
  update public.resume_tailoring_sessions set source_snapshot='{"schemaVersion":1,"summary":"Forged"}'::jsonb
  where id='aaaaaaaa-1111-4111-8111-111111111111';
 exception when others then rejected:=true;end;
 if not rejected then raise exception 'Original source snapshot was overwritten';end if;
end $$;
select set_config('request.jwt.claim.sub','cdcdcdcd-cdcd-4cdc-8cdc-cdcdcdcdcdcd',false);
do $$
declare foreign_rows integer;denied boolean:=false;
begin
 select count(*) into foreign_rows from public.resume_tailoring_sessions;
 if foreign_rows<>0 then raise exception 'Another owner can see private job brief';end if;
 update public.resume_tailoring_sessions set private_notes='Forged'
 where id='aaaaaaaa-1111-4111-8111-111111111111';
 get diagnostics foreign_rows=row_count;
 if foreign_rows<>0 then raise exception 'Another owner can edit private job brief';end if;
 begin
  insert into public.resume_tailoring_sessions(user_id,job_title,original_job_description,source_resume_id)
  values('cdcdcdcd-cdcd-4cdc-8cdc-cdcdcdcdcdcd','Forged',
   'Experience with Microsoft Excel and reporting required. Good teamwork is desirable.',
   'babbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
 exception when others then denied:=true;end;
 if not denied then raise exception 'Cross-owner source resume FK accepted';end if;
end $$;
select set_config('request.jwt.claim.sub','abababab-abab-4aba-8aba-abababababab',false);
-- Removing the source resume retains the private immutable comparison baseline.
delete from public.resumes where id='babbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
do $$
begin
 if not exists(
  select 1 from public.resume_tailoring_sessions
  where id='aaaaaaaa-1111-4111-8111-111111111111'
   and source_resume_id is null and source_snapshot is not null
 ) then raise exception 'Deleting source removed the historical comparison';end if;
end $$;
delete from public.resume_tailoring_sessions where id='aaaaaaaa-1111-4111-8111-111111111111';
reset role;
-- Synthetic owner erasure cascades the private data.
delete from auth.users where id in
 ('abababab-abab-4aba-8aba-abababababab','cdcdcdcd-cdcd-4cdc-8cdc-cdcdcdcdcdcd');
do $$
begin
 if exists(select 1 from public.resume_tailoring_sessions
  where user_id in ('abababab-abab-4aba-8aba-abababababab','cdcdcdcd-cdcd-4cdc-8cdc-cdcdcdcdcdcd')) then
  raise exception 'Account erasure left a job brief';end if;
end $$;
