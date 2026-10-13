-- Field-level, explicit suggestion revision and merge. Run after 004.
create or replace function public.edit_career_suggestion(
 suggestion_id uuid, proposed_kind text, proposed_title text, proposed_description text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
 if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
 if proposed_kind not in ('experience','education','skill','language','project','achievement','certification','volunteering')
 or char_length(trim(proposed_title)) not between 1 and 180
 or char_length(proposed_description) > 4000 then
  raise exception 'Invalid proposed information';
 end if;
 update public.career_suggestions
  set kind=proposed_kind,title=trim(proposed_title),description=proposed_description
 where id=suggestion_id and user_id=(select auth.uid()) and review_status='pending';
 return found;
end; $$;
revoke all on function public.edit_career_suggestion(uuid,text,text,text) from public,anon;
grant execute on function public.edit_career_suggestion(uuid,text,text,text) to authenticated;

create or replace function public.merge_career_suggestion(
 suggestion_id uuid, target_record_id uuid, expected_revision integer,
 merge_title boolean, merge_description boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare proposal public.career_suggestions%rowtype;
current_record public.career_records%rowtype;
begin
 if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
 if not coalesce(merge_title,false) and not coalesce(merge_description,false) then
   raise exception 'Choose at least one field to merge';
 end if;
 select * into proposal from public.career_suggestions
 where id=suggestion_id and user_id=(select auth.uid()) and review_status='pending' for update;
 if not found then raise exception 'This suggestion is no longer pending'; end if;
 select * into current_record from public.career_records
 where id=target_record_id and user_id=(select auth.uid()) for update;
 if not found then raise exception 'Record not found'; end if;
 if current_record.kind<>proposal.kind then raise exception 'Record categories must match'; end if;
 if current_record.revision<>expected_revision then raise exception 'Record changed since your review'; end if;
 update public.career_records set
  title=case when merge_title then proposal.title else current_record.title end,
  description=case when merge_description then proposal.description else current_record.description end
 where id=current_record.id and user_id=current_record.user_id;
 update public.career_suggestions set review_status='approved' where id=proposal.id;
 return current_record.id;
end; $$;
revoke all on function public.merge_career_suggestion(uuid,uuid,integer,boolean,boolean) from public,anon;
grant execute on function public.merge_career_suggestion(uuid,uuid,integer,boolean,boolean) to authenticated;
