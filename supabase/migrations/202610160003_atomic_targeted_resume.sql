-- Step 4 follow-up: create a job-specific CV and link it atomically.
-- ADDITIVE, GitHub-only. Never apply to linked Supabase without explicit owner approval.
-- SECURITY INVOKER deliberately enforces the authenticated user's table RLS.
create function public.create_my_targeted_resume(
 p_session uuid,
 p_revision integer,
 p_source uuid default null,
 p_version uuid default null,
 p_blank_doc jsonb default null,
 p_expected_source_revision integer default null
)
returns table(resume_id uuid,session_revision integer)
language plpgsql security invoker set search_path='' as $$
declare
 person uuid;
 job public.resume_tailoring_sessions%rowtype;
 base public.resumes%rowtype;
 snapshot jsonb;
 source_revision integer;
 version_number integer;
 new_resume_id uuid;
 linked_revision integer;
begin
 person:=(select auth.uid());
 if person is null then raise exception 'Sign in before creating a targeted CV'; end if;
 if p_session is null or p_revision is null or p_revision<1 then
  raise exception 'Invalid job brief or revision'; end if;
 if p_version is not null and p_source is null then
  raise exception 'A source version requires a selected source resume'; end if;
 if p_source is not null and p_blank_doc is not null then
  raise exception 'A source document and a blank document cannot both be provided'; end if;

 -- The row lock serialises concurrent tabs. Any failure rolls back the CV insert.
 select * into job from public.resume_tailoring_sessions
  where id=p_session and user_id=person for update;
 if not found then raise exception 'Job brief is unavailable'; end if;
 if job.revision<>p_revision then raise exception 'Job brief changed: refresh before copying';end if;
 if job.tailored_resume_id is not null then
  raise exception 'This job brief already has a targeted resume'; end if;

 if p_source is not null then
  select * into base from public.resumes
   where id=p_source and user_id=person for share;
  if not found then raise exception 'Source resume does not belong to this account';end if;
  source_revision:=base.revision;
  if p_version is null and (p_expected_source_revision is null or
    p_expected_source_revision<>base.revision) then
   raise exception 'Source resume changed: refresh before copying';
  end if;
  if p_version is not null then
   select v.snapshot_content,v.version_number into snapshot,version_number
    from public.resume_versions v
    where v.id=p_version and v.resume_id=p_source and v.user_id=person;
   if not found then raise exception 'Source version does not belong to this resume';end if;
  else
   snapshot:=base.draft_content;
  end if;
 else
  if p_blank_doc is null then raise exception 'Blank resume content required';end if;
  snapshot:=p_blank_doc;
 end if;

 if jsonb_typeof(snapshot)<>'object' or snapshot->>'schemaVersion'<>'1'
    or octet_length(snapshot::text)>180000 then
  raise exception 'Source resume document is invalid'; end if;
 if snapshot#>>'{settings,template}' is null or
    snapshot#>>'{settings,paper}' is null or
    snapshot#>>'{settings,language}' is null then
  raise exception 'Source resume design settings are incomplete'; end if;

 insert into public.resumes(user_id,name,focus_label,draft_content,
  template_id,paper_size,document_language)
 values(person,left(concat_ws(' — ',job.job_title,nullif(job.employer_name,'')),160),
  left(job.job_title,160),snapshot,snapshot#>>'{settings,template}',
  snapshot#>>'{settings,paper}',snapshot#>>'{settings,language}')
 returning id into new_resume_id;

 update public.resume_tailoring_sessions set
  source_resume_id=p_source,source_resume_revision=source_revision,
  source_version_number=version_number,source_snapshot=snapshot,
  tailored_resume_id=new_resume_id
 where id=p_session and user_id=person and revision=p_revision and tailored_resume_id is null
 returning revision into linked_revision;
 if not found then raise exception 'Job brief changed while linking the CV';end if;

 return query select new_resume_id,linked_revision;
end;
$$;
revoke all on function public.create_my_targeted_resume(uuid,integer,uuid,uuid,jsonb,integer)
 from public,anon;
grant execute on function public.create_my_targeted_resume(uuid,integer,uuid,uuid,jsonb,integer)
 to authenticated;

-- Even direct REST writes may not carry old approved evidence onto a newly
-- revised advert. Approvals are meaningful only for the saved source text.
create or replace function public.tailoring_revision_guard() returns trigger
language plpgsql set search_path='' as $$
begin
 if tg_op='INSERT' then
  if new.initial_job_description is distinct from new.original_job_description then
   raise exception 'First saved advert must match source job text';
  end if;
  return new;
 end if;
 if new.id<>old.id or new.user_id<>old.user_id or new.created_at<>old.created_at or
    new.initial_job_description is distinct from old.initial_job_description then
  raise exception 'Tailoring identity and original source are immutable';
 end if;
 if old.source_resume_id is not null and new.source_resume_id is distinct from old.source_resume_id
    and new.source_resume_id is not null then
  raise exception 'Source resume relationship cannot be reassigned';
 end if;
 if old.source_snapshot is not null and new.source_snapshot is distinct from old.source_snapshot then
  raise exception 'Original comparison snapshot is immutable';
 end if;
 if new.original_job_description is distinct from old.original_job_description and
    exists(select 1 from jsonb_array_elements(new.requirements) r
     where r->>'review'='approved') then
  raise exception 'Approve requirements only after saving the revised job text';
 end if;
 new.revision=old.revision+1;
 new.updated_at=now();
 return new;
end;
$$;
revoke all on function public.tailoring_revision_guard() from public,anon,authenticated;
