-- Atomic suggestion approval, no browser permission to rewrite approved facts.
drop policy if exists "suggestions own update" on public.career_suggestions;
create or replace function public.approve_career_suggestion(suggestion_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare item public.career_suggestions%rowtype;
record_id uuid;
begin
 if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
 select * into item from public.career_suggestions
   where id = suggestion_id and user_id = (select auth.uid()) and review_status = 'pending'
   for update;
 if not found then raise exception 'Suggestion not available for approval'; end if;
 insert into public.career_records(user_id,kind,title,description,status,source)
 values (item.user_id,item.kind,item.title,item.description,'confirmed',
         case when item.origin='ai' then 'ai' else 'import' end)
 returning id into record_id;
 update public.career_suggestions set review_status = 'approved' where id = item.id;
 return record_id;
end; $$;
revoke all on function public.approve_career_suggestion(uuid) from public, anon;
grant execute on function public.approve_career_suggestion(uuid) to authenticated;

create or replace function public.reject_career_suggestion(suggestion_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
 if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
 update public.career_suggestions
 set review_status = 'rejected'
 where id = suggestion_id and user_id = (select auth.uid()) and review_status = 'pending';
 return found;
end; $$;
revoke all on function public.reject_career_suggestion(uuid) from public, anon;
grant execute on function public.reject_career_suggestion(uuid) to authenticated;
