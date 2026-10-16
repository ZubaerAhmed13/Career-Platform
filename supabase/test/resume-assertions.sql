\set ON_ERROR_STOP on
-- Step 3 assertions ONLY against ephemeral PostgreSQL CI fixture.
-- Assert exact production-oriented grants before creating any synthetic users.
do $$
begin
 if has_table_privilege('anon','public.resumes','SELECT') or
    has_table_privilege('anon','public.resume_versions','SELECT') or
    has_table_privilege('anon','public.resumes','INSERT') or
    has_table_privilege('anon','public.resume_versions','INSERT') then
  raise exception 'Anonymous grants are too broad';
 end if;
 if has_table_privilege('authenticated','public.resumes','TRUNCATE') or
    has_table_privilege('authenticated','public.resumes','TRIGGER') or
    has_table_privilege('authenticated','public.resume_versions','INSERT') or
    has_table_privilege('authenticated','public.resume_versions','UPDATE') or
    has_table_privilege('authenticated','public.resume_versions','DELETE') or
    has_table_privilege('authenticated','public.resume_versions','TRUNCATE') then
  raise exception 'Authenticated resume history or administrative grants are too broad';
 end if;
 if not (has_table_privilege('authenticated','public.resumes','SELECT')
  and has_table_privilege('authenticated','public.resumes','INSERT')
  and has_table_privilege('authenticated','public.resumes','UPDATE')
  and has_table_privilege('authenticated','public.resumes','DELETE')
  and has_table_privilege('authenticated','public.resume_versions','SELECT'))
 then raise exception 'Required Resume Studio authenticated grants missing'; end if;
end $$;

do $$
begin
 if has_function_privilege('anon','public.resume_source_guard()','EXECUTE') or
    has_function_privilege('authenticated','public.resume_source_guard()','EXECUTE') or
    has_function_privilege('anon','public.resume_revision_guard()','EXECUTE') then
  raise exception 'Internal resume trigger API was exposed';
 end if;
end $$;
insert into auth.users(id,email) values
('cccccccc-cccc-4ccc-8ccc-cccccccccccc','resume_a@example.invalid'),
('dddddddd-dddd-4ddd-8ddd-dddddddddddd','resume_b@example.invalid');
-- Privileges come from the new additive migration. Direct version writes remain blocked.
set role authenticated;
select set_config('request.jwt.claim.sub','cccccccc-cccc-4ccc-8ccc-cccccccccccc',false);
select set_config('request.jwt.claim.role','authenticated',false);
insert into public.resumes(id,user_id,name,draft_content,template_id,paper_size,document_language)
values('33333333-3333-4333-8333-333333333333','cccccccc-cccc-4ccc-8ccc-cccccccccccc',
'Owner A','{"schemaVersion":1,"contact":{"name":"Test A"}}'::jsonb,'ats-classic','A4','en');
select public.create_my_resume_version('33333333-3333-4333-8333-333333333333','First snapshot',1);
do $$
declare rejected boolean:=false; versions integer;
begin
 select count(*) into versions from public.resume_versions where resume_id='33333333-3333-4333-8333-333333333333';
 if versions<>1 then raise exception 'Owned version creation failed';end if;
 begin
  insert into public.resume_versions(user_id,resume_id,version_number,snapshot_content)
  values('cccccccc-cccc-4ccc-8ccc-cccccccccccc','33333333-3333-4333-8333-333333333333',2,'{"schemaVersion":1}'::jsonb);
 exception when others then rejected:=true;end;
 if not rejected then raise exception 'Direct version insertion unexpectedly succeeded';end if;
end $$;
update public.resumes set name='Owner A updated'
where id='33333333-3333-4333-8333-333333333333' and revision=1;
do $$
declare rev int; rejected boolean:=false;
begin
 select revision into rev from public.resumes where id='33333333-3333-4333-8333-333333333333';
 if rev<>2 then raise exception 'Revision not incremented';end if;
 begin
  perform public.create_my_resume_version('33333333-3333-4333-8333-333333333333','stale',1);
 exception when others then rejected:=true;end;
 if not rejected then raise exception 'Stale version submission accepted';end if;
end $$;
-- Create a valid A-owned fact to test cross-owner direct API forgery.
insert into public.career_records(id,user_id,kind,title)
values('55555555-5555-4555-8555-555555555555',
 'cccccccc-cccc-4ccc-8ccc-cccccccccccc','experience','Only A');
select set_config('request.jwt.claim.sub','dddddddd-dddd-4ddd-8ddd-dddddddddddd',false);
insert into public.resumes(id,user_id,name,draft_content,template_id,paper_size,document_language)
values('44444444-4444-4444-8444-444444444444','dddddddd-dddd-4ddd-8ddd-dddddddddddd',
'Owner B','{"schemaVersion":1,"contact":{"name":"Test B"}}'::jsonb,'modern-professional','Letter','en');
do $$
declare count_a int;cross_written int;denied boolean:=false;
begin
 select count(*) into count_a from public.resumes where id='33333333-3333-4333-8333-333333333333';
 if count_a<>0 then raise exception 'Cross-owner resume read exposed';end if;
 update public.resumes set name='Forged' where id='33333333-3333-4333-8333-333333333333';
 get diagnostics cross_written=row_count;
 if cross_written<>0 then raise exception 'Cross-owner update accepted';end if;
 begin
  perform public.create_my_resume_version('33333333-3333-4333-8333-333333333333','foreign',2);
 exception when others then denied:=true;end;
 if not denied then raise exception 'Foreign version created';end if;
end $$;

-- A direct authenticated request cannot forge another account's source UUID.
do $$
declare denied boolean:=false;
begin
 begin
  update public.resumes set draft_content=
  '{"schemaVersion":1,"sections":[{"entries":[{"source":{"recordId":"55555555-5555-4555-8555-555555555555","revision":1,"kind":"experience","title":"Only A","organization":"","description":""}}]}]}'::jsonb
   where id='44444444-4444-4444-8444-444444444444';
 exception when others then denied:=true;end;
 if not denied then raise exception 'Direct Data API forged foreign source';end if;
end $$;
-- Owner A may attach its exact source, preserve it after original deletion and
-- create an immutable historical copy even after its canonical source vanishes.
select set_config('request.jwt.claim.sub','cccccccc-cccc-4ccc-8ccc-cccccccccccc',false);
update public.resumes set draft_content=
 '{"schemaVersion":1,"sections":[{"entries":[{"source":{"recordId":"55555555-5555-4555-8555-555555555555","revision":1,"kind":"experience","title":"Only A","organization":"","description":""}}]}]}'::jsonb
 where id='33333333-3333-4333-8333-333333333333';
select public.create_my_resume_version('33333333-3333-4333-8333-333333333333','Vault snapshot',3);
delete from public.career_records where id='55555555-5555-4555-8555-555555555555';
update public.resumes set name='Source deleted but version preserved'
 where id='33333333-3333-4333-8333-333333333333';

reset role;
do $$
declare count_saved int;
begin
 select count(*) into count_saved from public.resume_versions where resume_id='33333333-3333-4333-8333-333333333333';
 if count_saved<>2 then raise exception 'Immutable A snapshots missing';end if;
 if exists(select 1 from pg_policies where schemaname='public' and tablename='resume_versions' and cmd in ('UPDATE','DELETE','INSERT','ALL')) then
  raise exception 'Resume versions have client mutation policy';end if;
 if not (select relrowsecurity from pg_class where oid='public.resumes'::regclass) or
    not (select relrowsecurity from pg_class where oid='public.resume_versions'::regclass) then
  raise exception 'Resume tables missing RLS';end if;
end $$;
-- Delete A's auth user in disposable fixture: both tables must cascade.
delete from auth.users where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
do $$
begin
 if exists(select 1 from public.resumes where user_id='cccccccc-cccc-4ccc-8ccc-cccccccccccc')
    or exists(select 1 from public.resume_versions where user_id='cccccccc-cccc-4ccc-8ccc-cccccccccccc') then
  raise exception 'Full account deletion left owned resume data';end if;
 if not exists(select 1 from public.resumes where user_id='dddddddd-dddd-4ddd-8ddd-dddddddddddd') then
  raise exception 'Deleted account erased an unrelated resume';end if;
end $$;
-- Clear Career Vault B: B's saved resume must remain intact.
set role authenticated;
select set_config('request.jwt.claim.sub','dddddddd-dddd-4ddd-8ddd-dddddddddddd',false);
select set_config('request.jwt.claim.role','authenticated',false);
select public.clear_my_career_vault();
do $$
begin
 if not exists(select 1 from public.resumes where id='44444444-4444-4444-8444-444444444444') then
  raise exception 'Vault clear unexpectedly destroyed saved resumes';end if;
end $$;
reset role;
