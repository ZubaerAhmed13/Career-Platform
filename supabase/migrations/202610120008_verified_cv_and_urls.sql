-- Enforce safe source links for newly written evidence and verified service-only AI CV suggestions.
-- Existing invalid URLs must be reviewed separately before VALIDATE CONSTRAINT.
alter table public.career_evidence
 add constraint career_evidence_http_links_only
 check (source_url='' or source_url ~* '^https?://[^[:space:]]+$') not valid;

create function public.persist_verified_ai_cv_suggestions(
 target_user_id uuid,
 original_text text,
 proposals jsonb
) returns integer
language plpgsql security definer set search_path = '' as $$
declare
 item jsonb;
 count_added integer;
begin
 if (select auth.role()) is distinct from 'service_role' then
   raise exception 'Trusted AI service authorization required';
 end if;
 if original_text is null or char_length(original_text) not between 20 and 4000
    or jsonb_typeof(proposals) is distinct from 'array'
    or jsonb_array_length(proposals)>6 then
   raise exception 'Invalid extraction payload';
 end if;
 if not exists(select 1 from auth.users where id=target_user_id) then
   raise exception 'No matching account';
 end if;
 for item in select value from jsonb_array_elements(proposals) loop
   if item->>'kind' not in ('experience','education','skill','language','project','achievement','certification','volunteering')
     or char_length(trim(coalesce(item->>'title',''))) not between 1 and 180
     or char_length(coalesce(item->>'description',''))>4000
     or char_length(coalesce(item->>'evidence_quote','')) not between 6 and 2000
     or position((item->>'evidence_quote') in original_text)=0 then
     raise exception 'Extraction is unsupported by the submitted CV text';
   end if;
 end loop;
 insert into public.career_suggestions(
  user_id,kind,title,description,evidence_quote,origin,review_status
 )
 select target_user_id,
  entry.value->>'kind',trim(entry.value->>'title'),
  coalesce(entry.value->>'description',''),
  entry.value->>'evidence_quote','ai','pending'
 from jsonb_array_elements(proposals) as entry(value);
 get diagnostics count_added = row_count;
 return count_added;
end; $$;
revoke all on function public.persist_verified_ai_cv_suggestions(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.persist_verified_ai_cv_suggestions(uuid,text,jsonb) to service_role;
