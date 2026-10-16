-- Disposable CI only. Never apply to a linked Supabase project.
create role authenticator login password 'temp-ci-postgrest-2026';
grant authenticated,anon to authenticator;
grant usage on schema public to authenticator;
create or replace function auth.uid() returns uuid language sql stable as $$
 select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),
 nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid
$$;
create or replace function auth.role() returns text language sql stable as $$
 select coalesce(nullif(current_setting('request.jwt.claim.role',true),''),
 nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role')
$$;
insert into auth.users(id,email) values
 ('10101010-1010-4010-8010-101010101010','synthetic-a@example.invalid'),
 ('20202020-2020-4020-8020-202020202020','synthetic-b@example.invalid');
insert into public.career_records
 (id,user_id,kind,title,organization,description,status,revision)
 values ('30303030-3030-4030-8030-303030303030',
 '10101010-1010-4010-8010-101010101010','experience',
 'Synthetic Operations Assistant','Example Organisation',
 'Verified synthetic inventory responsibilities.','confirmed',1);

-- The older, broad RLS assertion fixture grants all table privileges to anon
-- and authenticated for unrelated testing. Restore the real Step 3 grants here.
revoke all on public.resumes, public.resume_versions from anon;
revoke insert,update,delete on public.resume_versions from authenticated;
grant select on public.resume_versions to authenticated;
