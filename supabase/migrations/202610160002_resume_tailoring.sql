-- CareerOS Step 4: additive private tailoring sessions.
-- Commit for disposable CI only; do not apply to connected production Supabase.
create table public.resume_tailoring_sessions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 job_title text not null check (char_length(job_title) between 1 and 180),
 employer_name text not null default '' check (char_length(employer_name)<=180),
 job_location text not null default '' check (char_length(job_location)<=180),
 employment_type text not null default '' check (char_length(employment_type)<=100),
 job_url text not null default '' check (char_length(job_url)<=1500 and (job_url='' or job_url ~* '^https?://')),
 original_job_description text not null check (char_length(original_job_description) between 40 and 50000),
 initial_job_description text not null check (char_length(initial_job_description) between 40 and 50000),
 private_notes text not null default '' check (char_length(private_notes)<=4000),
 requirements jsonb not null default '[]'::jsonb check (
  jsonb_typeof(requirements)='array' and jsonb_array_length(requirements)<=100
  and octet_length(requirements::text)<=70000),
 source_resume_id uuid,
 source_resume_revision integer check (source_resume_revision>0),
 source_version_number integer check (source_version_number>0),
 source_snapshot jsonb check (source_snapshot is null or (
  jsonb_typeof(source_snapshot)='object'
  and source_snapshot->>'schemaVersion'='1'
  and octet_length(source_snapshot::text)<=180000)),
 tailored_resume_id uuid,
 revision integer not null default 1 check (revision>0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(id,user_id),
 foreign key(source_resume_id,user_id) references public.resumes(id,user_id)
  on delete set null (source_resume_id),
 foreign key(tailored_resume_id,user_id) references public.resumes(id,user_id)
  on delete set null (tailored_resume_id),
 check (tailored_resume_id is null or tailored_resume_id is distinct from source_resume_id)
);
create index resume_tailoring_owner_recent on public.resume_tailoring_sessions(user_id,updated_at desc);
create index resume_tailoring_source on public.resume_tailoring_sessions(source_resume_id,user_id);
create index resume_tailoring_target on public.resume_tailoring_sessions(tailored_resume_id,user_id);
alter table public.resume_tailoring_sessions enable row level security;
create policy "tailoring own select" on public.resume_tailoring_sessions for select to authenticated
 using (user_id=(select auth.uid()));
create policy "tailoring own insert" on public.resume_tailoring_sessions for insert to authenticated
 with check (user_id=(select auth.uid()));
create policy "tailoring own update" on public.resume_tailoring_sessions for update to authenticated
 using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy "tailoring own delete" on public.resume_tailoring_sessions for delete to authenticated
 using (user_id=(select auth.uid()));
create function public.tailoring_revision_guard() returns trigger
 language plpgsql set search_path='' as $$
begin
 if new.id<>old.id or new.user_id<>old.user_id or new.created_at<>old.created_at or
  new.initial_job_description is distinct from old.initial_job_description then
  raise exception 'Tailoring identity is immutable';
 end if;
 if old.source_resume_id is not null and new.source_resume_id is distinct from old.source_resume_id
  and new.source_resume_id is not null then
  raise exception 'Source resume relationship cannot be reassigned';
 end if;
 if old.source_snapshot is not null and new.source_snapshot is distinct from old.source_snapshot then
  raise exception 'Original comparison snapshot is immutable';
 end if;
 new.revision=old.revision+1;
 new.updated_at=now();
 return new;
end; $$;
create trigger bump_tailoring_revision before update on public.resume_tailoring_sessions
 for each row execute function public.tailoring_revision_guard();
revoke all on function public.tailoring_revision_guard() from public,anon,authenticated;
-- Supabase can default to wide grants, so explicitly restrict before granting.
revoke all on public.resume_tailoring_sessions from anon,authenticated;
grant select,insert,update,delete on public.resume_tailoring_sessions to authenticated;
