-- Add fully editable structured fields to a CV review proposal.
-- No provider-generated employer or dates are trusted without user review.
alter table public.career_suggestions
 add column organization text not null default '' check (char_length(organization)<=180),
 add column location text not null default '' check (char_length(location)<=150),
 add column started_on date,
 add column ended_on date,
 add column is_current boolean not null default false,
 add constraint career_suggestion_dates_valid check (
  (started_on is null or ended_on is null or started_on<=ended_on)
  and (not is_current or ended_on is null)
 );

create or replace function public.approve_career_suggestion(suggestion_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
 item public.career_suggestions%rowtype;
 record_id uuid;
begin
 if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
 select * into item from public.career_suggestions
 where id=suggestion_id and user_id=(select auth.uid()) and review_status='pending'
 for update;
 if not found then raise exception 'Suggestion not available for approval'; end if;

 perform pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended(item.user_id::text||'|'||item.kind||'|'||lower(trim(item.title)),0)
 );
 if exists (
  select 1 from public.career_records r
  where r.user_id=item.user_id and r.kind=item.kind and r.status='confirmed'
   and lower(trim(r.title))=lower(trim(item.title))
 ) then
  raise exception 'A confirmed fact with this title exists. Compare records and explicitly save separately if appropriate';
 end if;
 insert into public.career_records(
 user_id,kind,title,description,organization,location,started_on,ended_on,is_current,status,source
 )
 values(item.user_id,item.kind,item.title,item.description,
 item.organization,item.location,item.started_on,item.ended_on,item.is_current,
 'confirmed',case when item.origin='ai' then 'ai' else 'import' end)
 returning id into record_id;
 update public.career_suggestions set review_status='approved' where id=item.id;
 return record_id;
end; $$;

create or replace function public.approve_career_suggestion_separately(suggestion_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
 item public.career_suggestions%rowtype;
 record_id uuid;
begin
 if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
 select * into item from public.career_suggestions
 where id=suggestion_id and user_id=(select auth.uid()) and review_status='pending'
 for update;
 if not found then raise exception 'Suggestion not available for approval'; end if;
 perform pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended(item.user_id::text||'|'||item.kind||'|'||lower(trim(item.title)),0)
 );
 insert into public.career_records(
 user_id,kind,title,description,organization,location,started_on,ended_on,is_current,status,source
 )
 values(item.user_id,item.kind,item.title,item.description,
 item.organization,item.location,item.started_on,item.ended_on,item.is_current,
 'confirmed',case when item.origin='ai' then 'ai' else 'import' end)
 returning id into record_id;
 update public.career_suggestions set review_status='approved' where id=item.id;
 return record_id;
end; $$;


-- Direct proposal correction: update only pending rows owned by this user.
create function public.edit_career_suggestion_details(
 suggestion_id uuid, proposed_kind text, proposed_title text,
 proposed_description text, proposed_organization text,
 proposed_location text, proposed_started_on date,
 proposed_ended_on date, proposed_is_current boolean
) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
 if proposed_kind not in ('experience','education','skill','language','project','achievement','certification','volunteering')
    or char_length(trim(coalesce(proposed_title,''))) not between 1 and 180
    or char_length(coalesce(proposed_description,''))>4000
    or char_length(coalesce(proposed_organization,''))>180
    or char_length(coalesce(proposed_location,''))>150
    or (proposed_started_on is not null and proposed_ended_on is not null
     and proposed_started_on>proposed_ended_on)
    or (coalesce(proposed_is_current,false) and proposed_ended_on is not null)
 then raise exception 'Invalid reviewed career information'; end if;
 update public.career_suggestions set
  kind=proposed_kind,title=trim(proposed_title),
  description=coalesce(proposed_description,''),
  organization=coalesce(proposed_organization,''),
  location=coalesce(proposed_location,''),
  started_on=proposed_started_on,ended_on=proposed_ended_on,
  is_current=coalesce(proposed_is_current,false)
 where id=suggestion_id and user_id=(select auth.uid()) and review_status='pending';
 return found;
end; $$;
revoke all on function public.edit_career_suggestion_details(uuid,text,text,text,text,text,date,date,boolean) from public,anon;
grant execute on function public.edit_career_suggestion_details(uuid,text,text,text,text,text,date,date,boolean) to authenticated;

-- An explicit selected-field merge. Dates are selected as a complete range.
create function public.merge_career_suggestion_details(
 suggestion_id uuid,target_record_id uuid,expected_revision integer,
 merge_title boolean,merge_description boolean,merge_organization boolean,
 merge_location boolean,merge_dates boolean
) returns uuid language plpgsql security definer set search_path='' as $$
declare
 proposal public.career_suggestions%rowtype;
 current_record public.career_records%rowtype;
begin
 if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
 if not (coalesce(merge_title,false) or coalesce(merge_description,false)
  or coalesce(merge_organization,false) or coalesce(merge_location,false)
  or coalesce(merge_dates,false)) then
  raise exception 'Choose at least one field to merge';
 end if;
 select * into proposal from public.career_suggestions
  where id=suggestion_id and user_id=(select auth.uid()) and review_status='pending'
  for update;
 if not found then raise exception 'Suggestion no longer pending'; end if;
 select * into current_record from public.career_records
  where id=target_record_id and user_id=(select auth.uid()) for update;
 if not found then raise exception 'Confirmed record unavailable'; end if;
 if current_record.status<>'confirmed' or current_record.kind<>proposal.kind then
  raise exception 'Can merge only into confirmed records of the same category';
 end if;
 if current_record.revision<>expected_revision then
  raise exception 'Record changed since review; reload before merging';
 end if;
 update public.career_records set
  title=case when merge_title then proposal.title else current_record.title end,
  description=case when merge_description then proposal.description else current_record.description end,
  organization=case when merge_organization then proposal.organization else current_record.organization end,
  location=case when merge_location then proposal.location else current_record.location end,
  started_on=case when merge_dates then proposal.started_on else current_record.started_on end,
  ended_on=case when merge_dates then proposal.ended_on else current_record.ended_on end,
  is_current=case when merge_dates then proposal.is_current else current_record.is_current end
 where id=current_record.id and user_id=current_record.user_id;
 update public.career_suggestions set review_status='approved' where id=proposal.id;
 return current_record.id;
end; $$;
revoke all on function public.merge_career_suggestion_details(uuid,uuid,integer,boolean,boolean,boolean,boolean,boolean) from public,anon;
grant execute on function public.merge_career_suggestion_details(uuid,uuid,integer,boolean,boolean,boolean,boolean,boolean) to authenticated;
