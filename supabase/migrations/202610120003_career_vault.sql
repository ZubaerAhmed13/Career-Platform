-- CareerOS milestone 2. Apply AFTER 001 and 002, after confirming project, backups and migration history.
-- Each private row carries its owner; composite foreign keys prevent cross-owner links.
create table public.career_records (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check (kind in ('experience','education','skill','language','project','achievement','certification','volunteering')),
 title text not null check (char_length(title) between 1 and 180),
 organization text not null default '' check (char_length(organization) <= 180),
 location text not null default '' check (char_length(location) <= 150),
 description text not null default '' check (char_length(description) <= 8000),
 started_on date,
 ended_on date,
 is_current boolean not null default false,
 details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
 status text not null default 'confirmed' check (status in ('confirmed','unreviewed','conflict')),
 source text not null default 'manual' check (source in ('manual','import','ai')),
 revision integer not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (id, user_id),
 constraint valid_record_dates check (ended_on is null or started_on is null or ended_on >= started_on),
 constraint current_record_has_no_end check (not is_current or ended_on is null)
);
create index career_records_owner_kind on public.career_records(user_id, kind, updated_at desc);
create index career_records_owner_status on public.career_records(user_id, status);
alter table public.career_records enable row level security;
create policy "records select own" on public.career_records for select to authenticated using (user_id = (select auth.uid()));
create policy "records insert own" on public.career_records for insert to authenticated with check (user_id = (select auth.uid()));
create policy "records update own" on public.career_records for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "records delete own" on public.career_records for delete to authenticated using (user_id = (select auth.uid()));

create function public.career_record_revision() returns trigger language plpgsql set search_path = '' as $$
begin
 new.user_id = old.user_id;
 new.created_at = old.created_at;
 new.revision = old.revision + 1;
 new.updated_at = now();
 return new;
end; $$;
create trigger career_revision before update on public.career_records
 for each row execute function public.career_record_revision();

create table public.career_evidence (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 title text not null check (char_length(title) between 1 and 180),
 evidence_type text not null check (evidence_type in ('note','url','document_reference')),
 excerpt text not null default '' check (char_length(excerpt) <= 4000),
 source_url text not null default '' check (char_length(source_url) <= 1500),
 created_at timestamptz not null default now(),
 unique (id,user_id)
);
create index career_evidence_owner on public.career_evidence(user_id,created_at desc);
alter table public.career_evidence enable row level security;
create policy "evidence own select" on public.career_evidence for select to authenticated using (user_id = (select auth.uid()));
create policy "evidence own insert" on public.career_evidence for insert to authenticated with check (user_id = (select auth.uid()));
create policy "evidence own update" on public.career_evidence for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "evidence own delete" on public.career_evidence for delete to authenticated using (user_id = (select auth.uid()));

create table public.career_links (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 from_record_id uuid not null,
 to_record_id uuid not null,
 relation text not null check (relation in ('uses_skill','supports_achievement','related_project','related_education','related')),
 created_at timestamptz not null default now(),
 unique(user_id,from_record_id,to_record_id,relation),
 foreign key (from_record_id,user_id) references public.career_records(id,user_id) on delete cascade,
 foreign key (to_record_id,user_id) references public.career_records(id,user_id) on delete cascade,
 check (from_record_id <> to_record_id)
);
create index career_links_from on public.career_links(user_id,from_record_id);
create index career_links_to on public.career_links(user_id,to_record_id);
alter table public.career_links enable row level security;
create policy "links own select" on public.career_links for select to authenticated using (user_id=(select auth.uid()));
create policy "links own insert" on public.career_links for insert to authenticated with check (user_id=(select auth.uid()));
create policy "links own delete" on public.career_links for delete to authenticated using (user_id=(select auth.uid()));

create table public.career_evidence_links (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 record_id uuid not null,
 evidence_id uuid not null,
 created_at timestamptz not null default now(),
 unique(user_id,record_id,evidence_id),
 foreign key (record_id,user_id) references public.career_records(id,user_id) on delete cascade,
 foreign key (evidence_id,user_id) references public.career_evidence(id,user_id) on delete cascade
);
create index evidence_links_by_record on public.career_evidence_links(user_id,record_id);
alter table public.career_evidence_links enable row level security;
create policy "evidence links own select" on public.career_evidence_links for select to authenticated using (user_id=(select auth.uid()));
create policy "evidence links own insert" on public.career_evidence_links for insert to authenticated with check (user_id=(select auth.uid()));
create policy "evidence links own delete" on public.career_evidence_links for delete to authenticated using (user_id=(select auth.uid()));

create table public.career_interview_sessions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 title text not null default 'Career exploration' check (char_length(title)<=160),
 status text not null default 'active' check (status in ('active','completed')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(id,user_id)
);
create index career_sessions_owner on public.career_interview_sessions(user_id,updated_at desc);
alter table public.career_interview_sessions enable row level security;
create policy "sessions own select" on public.career_interview_sessions for select to authenticated using (user_id=(select auth.uid()));
create policy "sessions own insert" on public.career_interview_sessions for insert to authenticated with check (user_id=(select auth.uid()));
create policy "sessions own update" on public.career_interview_sessions for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy "sessions own delete" on public.career_interview_sessions for delete to authenticated using (user_id=(select auth.uid()));

create table public.career_interview_messages (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 session_id uuid not null,
 role text not null check (role in ('user','assistant')),
 content text not null check (char_length(content) between 1 and 5000),
 created_at timestamptz not null default now(),
 foreign key(session_id,user_id) references public.career_interview_sessions(id,user_id) on delete cascade
);
create index career_messages_session on public.career_interview_messages(user_id,session_id,created_at);
alter table public.career_interview_messages enable row level security;
create policy "messages own select" on public.career_interview_messages for select to authenticated using (user_id=(select auth.uid()));
create policy "messages own insert" on public.career_interview_messages for insert to authenticated with check (user_id=(select auth.uid()));
-- Intentionally immutable messages: no UPDATE/DELETE policy. Sessions can be deleted by owner.

create table public.career_suggestions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 session_id uuid,
 kind text not null check (kind in ('experience','education','skill','language','project','achievement','certification','volunteering')),
 title text not null check (char_length(title) between 1 and 180),
 description text not null default '' check (char_length(description)<=4000),
 evidence_quote text not null default '' check (char_length(evidence_quote)<=2000),
 origin text not null check (origin in ('ai','cv_import')),
 review_status text not null default 'pending' check (review_status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(),
 foreign key(session_id,user_id) references public.career_interview_sessions(id,user_id) on delete cascade
);
create index career_suggestions_owner on public.career_suggestions(user_id,review_status,created_at desc);
alter table public.career_suggestions enable row level security;
create policy "suggestions own select" on public.career_suggestions for select to authenticated using (user_id=(select auth.uid()));
create policy "suggestions own insert" on public.career_suggestions for insert to authenticated with check (user_id=(select auth.uid()) and review_status='pending');
create policy "suggestions own update" on public.career_suggestions for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));

create table public.career_events (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 record_id uuid not null,
 action text not null check (action in ('created','updated','deleted')),
 before_value jsonb,
 after_value jsonb,
 created_at timestamptz not null default now()
);
create index career_events_owner_date on public.career_events(user_id,created_at desc);
alter table public.career_events enable row level security;
create policy "career events own read" on public.career_events for select to authenticated using (user_id=(select auth.uid()));
-- Events written by database trigger, never directly by browser.
create function public.log_career_record_change() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if tg_op = 'INSERT' then
   insert into public.career_events(user_id,record_id,action,after_value)
   values(new.user_id,new.id,'created',to_jsonb(new));
   return new;
 elsif tg_op = 'UPDATE' then
   insert into public.career_events(user_id,record_id,action,before_value,after_value)
   values(new.user_id,new.id,'updated',to_jsonb(old),to_jsonb(new));
   return new;
 else
   insert into public.career_events(user_id,record_id,action,before_value)
   values(old.user_id,old.id,'deleted',to_jsonb(old));
   return old;
 end if;
end; $$;
create trigger log_career_record_change after insert or update or delete on public.career_records
 for each row execute function public.log_career_record_change();
