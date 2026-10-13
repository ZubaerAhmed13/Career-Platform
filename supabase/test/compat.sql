-- Disposable PostgreSQL fixture only; NOT a replacement for Supabase Auth.
create role authenticated nologin;
create role anon nologin;
create role service_role nologin;
create schema auth;
create table auth.users (id uuid primary key,email text);
create function auth.uid() returns uuid language sql stable as $$
 select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
create function auth.role() returns text language sql stable as $$
 select nullif(current_setting('request.jwt.claim.role',true),'')
$$;
create schema storage;
create table storage.buckets (
 id text primary key,name text not null,public boolean not null default false,
 file_size_limit bigint,allowed_mime_types text[]
);
create table storage.objects (
 id uuid primary key default gen_random_uuid(),bucket_id text,name text not null
);
create function storage.foldername(value text) returns text[] language sql immutable as $$
 select string_to_array(value,'/')
$$;
grant usage on schema public,auth,storage to authenticated,anon,service_role;
grant execute on function auth.uid(),auth.role(),storage.foldername(text) to authenticated,anon,service_role;
