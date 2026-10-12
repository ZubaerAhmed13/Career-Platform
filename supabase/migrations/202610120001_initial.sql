-- Milestone 1: only account/profile and future private storage metadata.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  display_name text not null default '' check (char_length(display_name) <= 80),
  country text not null default '' check (char_length(country) <= 80),
  city text not null default '' check (char_length(city) <= 100),
  preferred_language text not null default 'en' check (preferred_language in ('en','de')),
  career_stage text not null default '' check (career_stage in ('','student','graduate','early','experienced','changer')),
  target_role text not null default '' check (char_length(target_role) <= 150),
  primary_goal text not null default '' check (primary_goal in ('','resume','cover_letter','job_search','applications','interview','growth')),
  theme_preference text not null default 'system' check (theme_preference in ('system','light','dark')),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "read own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "create own profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create or replace function public.touch_profile_updated_at() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at = now(); new.created_at = old.created_at; return new; end; $$;
create trigger touch_profile_updated_at before update on public.profiles for each row execute function public.touch_profile_updated_at();
-- User profile initialization without exposing a service credential.
create or replace function public.initialize_user_profile() returns trigger language plpgsql security definer set search_path = '' as $$ begin insert into public.profiles (id) values (new.id) on conflict (id) do nothing; return new; end; $$;
create trigger initialize_user_profile after insert on auth.users for each row execute function public.initialize_user_profile();
create table if not exists public.file_metadata (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 object_path text not null unique,
 filename text not null check(char_length(filename)<=255),
 mime_type text not null,
 byte_size bigint not null check(byte_size>=0),
 created_at timestamptz not null default now(),
 constraint owner_path check (object_path like (user_id::text || '/%'))
);
create index if not exists file_metadata_by_user on public.file_metadata(user_id);
alter table public.file_metadata enable row level security;
create policy "read own file metadata" on public.file_metadata for select to authenticated using ((select auth.uid())=user_id);
create policy "insert own file metadata" on public.file_metadata for insert to authenticated with check ((select auth.uid())=user_id);
create policy "delete own file metadata" on public.file_metadata for delete to authenticated using ((select auth.uid())=user_id);
-- Private bucket: UI uploads are deliberately disabled pending malware scanning and upload workflow.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('career-private','career-private',false,10485760,array['application/pdf','image/jpeg','image/png']) on conflict (id) do nothing;
create policy "owners read stored objects" on storage.objects for select to authenticated using (bucket_id='career-private' and (storage.foldername(name))[1]=(select auth.uid())::text);
-- No browser INSERT policy: uploads remain disabled until scanning and validation are introduced.
