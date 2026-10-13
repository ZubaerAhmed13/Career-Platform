-- Guard accidental duplicate confirmations while retaining a separate explicit user choice.
-- All reviews are owner-scoped and serialized on user/category/title.
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
 insert into public.career_records(user_id,kind,title,description,status,source)
 values(item.user_id,item.kind,item.title,item.description,'confirmed',
   case when item.origin='ai' then 'ai' else 'import' end)
 returning id into record_id;
 update public.career_suggestions set review_status='approved' where id=item.id;
 return record_id;
end; $$;

create function public.approve_career_suggestion_separately(suggestion_id uuid)
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
 insert into public.career_records(user_id,kind,title,description,status,source)
 values(item.user_id,item.kind,item.title,item.description,'confirmed',
   case when item.origin='ai' then 'ai' else 'import' end)
 returning id into record_id;
 update public.career_suggestions set review_status='approved' where id=item.id;
 return record_id;
end; $$;

revoke all on function public.approve_career_suggestion(uuid) from public,anon;
grant execute on function public.approve_career_suggestion(uuid) to authenticated;
revoke all on function public.approve_career_suggestion_separately(uuid) from public,anon;
grant execute on function public.approve_career_suggestion_separately(uuid) to authenticated;
