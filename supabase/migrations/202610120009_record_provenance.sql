-- Protect provenance of confirmed career facts.
-- A normal account may insert only a manually authored, confirmed record.
-- AI/import attribution comes from reviewed service/database transactions, never
-- from a browser choosing source='ai' or source='import'.
drop policy if exists "records insert own" on public.career_records;
create policy "records manually inserted by owner"
 on public.career_records for insert to authenticated
 with check (
   user_id = (select auth.uid())
   and source = 'manual'
   and status = 'confirmed'
 );

-- Preserve source/status/ownership during ordinary edits.
-- The earlier revision trigger already updated timestamps; replace it with
-- immutable provenance enforcement, keeping the same trigger installed.
create or replace function public.career_record_revision()
returns trigger language plpgsql set search_path = '' as $$
begin
 if new.id is distinct from old.id
    or new.user_id is distinct from old.user_id
    or new.created_at is distinct from old.created_at then
   raise exception 'Career record identity and creator cannot be changed';
 end if;

 if new.source is distinct from old.source
    or new.status is distinct from old.status then
   raise exception 'Career record provenance cannot be rewritten';
 end if;

 new.revision = old.revision + 1;
 new.updated_at = now();
 return new;
end; $$;

-- Browser-origin updates can edit content but not provenance; service-owned
-- approval and merge functions preserve source automatically.
