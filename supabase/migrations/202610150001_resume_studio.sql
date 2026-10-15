-- CareerOS Step 3: draft resumes and immutable user-created snapshots.
-- Additive schema only. Do not apply to owner's live Supabase project in GitHub-only mode.
create table public.resumes (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check (char_length(name) between 1 and 160),
 focus_label text not null default '' check (char_length(focus_label)<=160),
 draft_content jsonb not null check (jsonb_typeof(draft_content)='object' and
   octet_length(draft_content::text)<=180000 and draft_content->>'schemaVersion'='1'),
 template_id text not null check (template_id in ('ats-classic','modern-professional','student-graduate','european-clean','executive-minimal')),
 paper_size text not null check (paper_size in ('A4','Letter')),
 document_language text not null check (document_language in ('en','de')),
 revision integer not null default 1 check (revision>0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(id,user_id)
);
create index resumes_by_owner on public.resumes(user_id,updated_at desc);
alter table public.resumes enable row level security;
create policy "resumes own select" on public.resumes for select to authenticated using (user_id=(select auth.uid()));
create policy "resumes own insert" on public.resumes for insert to authenticated with check (user_id=(select auth.uid()));
create policy "resumes own update" on public.resumes for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy "resumes own delete" on public.resumes for delete to authenticated using (user_id=(select auth.uid()));

create function public.resume_revision_guard() returns trigger language plpgsql set search_path='' as $$
begin
 if new.id<>old.id or new.user_id<>old.user_id or new.created_at<>old.created_at then
  raise exception 'Resume identity is immutable';
 end if;
 new.revision=old.revision+1;
 new.updated_at=now();
 return new;
end; $$;
create trigger bump_resume_revision before update on public.resumes
 for each row execute function public.resume_revision_guard();

create table public.resume_versions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 resume_id uuid not null,
 version_number integer not null check (version_number>0),
 label text not null default '' check (char_length(label)<=120),
 snapshot_content jsonb not null check (jsonb_typeof(snapshot_content)='object' and
  octet_length(snapshot_content::text)<=180000 and snapshot_content->>'schemaVersion'='1'),
 created_at timestamptz not null default now(),
 foreign key (resume_id,user_id) references public.resumes(id,user_id) on delete cascade,
 unique(resume_id,version_number)
);
create index resume_versions_owner on public.resume_versions(user_id,resume_id,version_number desc);
alter table public.resume_versions enable row level security;
create policy "resume versions own select" on public.resume_versions
 for select to authenticated using (user_id=(select auth.uid()));
-- Intentionally no authenticated INSERT/UPDATE/DELETE policies.
-- The SECURITY DEFINER function below copies a locked draft atomically.
create function public.create_my_resume_version(p_resume uuid,p_label text default '',p_revision integer default null)
returns integer language plpgsql security definer set search_path='' as $$
declare person uuid; current_draft public.resumes%rowtype; next_version integer;
begin
 person:=(select auth.uid());
 if person is null then raise exception 'Authentication required'; end if;
 if p_label is null or char_length(p_label)>120 then raise exception 'Invalid label'; end if;
 select * into current_draft from public.resumes
  where id=p_resume and user_id=person for update;
 if not found then raise exception 'Resume not found'; end if;
 if p_revision is null or p_revision<>current_draft.revision then
  raise exception 'Resume has changed; refresh before saving a version';
 end if;
 select coalesce(max(version_number),0)+1 into next_version
  from public.resume_versions where resume_id=p_resume and user_id=person;
 insert into public.resume_versions(user_id,resume_id,version_number,label,snapshot_content)
 values(person,p_resume,next_version,p_label,current_draft.draft_content);
 return next_version;
end; $$;
revoke all on function public.create_my_resume_version(uuid,text,integer) from public,anon;
grant execute on function public.create_my_resume_version(uuid,text,integer) to authenticated;
-- No browser-owned write policy for versions. Admin account-delete cascades them.

-- Earlier migrations revoke public API rights. Grant only the newly required operations.
grant select,insert,update,delete on public.resumes to authenticated;
grant select on public.resume_versions to authenticated;


-- Defense in depth: direct authenticated Data API calls must not forge an
-- external owner's Career Vault source (even when bypassing Next server actions).
-- Snapshots already present in the same owner's saved draft, other saved resume
-- or immutable version may remain after the original Vault record is deleted.
create function public.resume_source_guard() returns trigger
language plpgsql security definer set search_path='' as $$
declare sec jsonb; item jsonb; src jsonb; found_record public.career_records%rowtype;
declare trusted boolean;
begin
 for sec in select value from jsonb_array_elements(coalesce(new.draft_content->'sections','[]'::jsonb)) loop
  for item in select value from jsonb_array_elements(coalesce(sec->'entries','[]'::jsonb)) loop
   src:=item->'source';
   if src is null or src='null'::jsonb then continue; end if;
   if jsonb_typeof(src)<>'object' then raise exception 'Invalid resume source'; end if;
   trusted:=false;
   -- Identical metadata previously present in an owned draft is historical.
   if tg_op='UPDATE' then
    select exists (
     select 1 from jsonb_array_elements(coalesce(old.draft_content->'sections','[]'::jsonb)) s,
      jsonb_array_elements(coalesce(s->'entries','[]'::jsonb)) e
     where e->'source'=src
    ) into trusted;
   end if;
   -- Duplicates/restores also retain legitimate metadata after Vault removal.
   if not trusted then
    select exists (
     select 1 from public.resumes r,
      jsonb_array_elements(coalesce(r.draft_content->'sections','[]'::jsonb)) s,
      jsonb_array_elements(coalesce(s->'entries','[]'::jsonb)) e
     where r.user_id=new.user_id and r.id<>new.id and e->'source'=src
    ) into trusted;
   end if;
   if not trusted then
    select exists (
     select 1 from public.resume_versions v,
      jsonb_array_elements(coalesce(v.snapshot_content->'sections','[]'::jsonb)) s,
      jsonb_array_elements(coalesce(s->'entries','[]'::jsonb)) e
     where v.user_id=new.user_id and e->'source'=src
    ) into trusted;
   end if;
   if trusted then continue; end if;
   -- New linkage must exactly match an existing *confirmed* same-owner record.
   if (src->>'recordId') is null or (src->>'revision') is null then
    raise exception 'Incomplete Career Vault source';
   end if;
   select * into found_record from public.career_records
    where id=(src->>'recordId')::uuid and user_id=new.user_id and status='confirmed';
   if not found or found_record.revision<>(src->>'revision')::integer
    or found_record.kind is distinct from src->>'kind'
    or found_record.title is distinct from src->>'title'
    or found_record.organization is distinct from src->>'organization'
    or found_record.description is distinct from src->>'description' then
    raise exception 'Only exact same-owner confirmed Vault sources can be linked';
   end if;
  end loop;
 end loop;
 return new;
end; $$;
create trigger protect_resume_sources before insert or update on public.resumes
 for each row execute function public.resume_source_guard();
