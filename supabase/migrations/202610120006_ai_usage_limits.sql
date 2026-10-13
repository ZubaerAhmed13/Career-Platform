-- Atomic AI rate accounting. The provider is never called without claiming quota.
-- No client policies grant direct access to these counters.
create table public.career_ai_usage (
 user_id uuid not null references auth.users(id) on delete cascade,
 bucket text not null check (bucket in ('minute','day')),
 bucket_start timestamptz not null,
 used integer not null default 0 check(used>=0 and used<=50),
 primary key(user_id,bucket,bucket_start)
);
alter table public.career_ai_usage enable row level security;

create function public.claim_career_ai_quota()
returns boolean language plpgsql security definer set search_path = '' as $$
declare current_uid uuid;
begin
 current_uid := (select auth.uid());
 if current_uid is null then raise exception 'Authentication required'; end if;
 insert into public.career_ai_usage(user_id,bucket,bucket_start,used)
 values(current_uid,'minute',date_trunc('minute',now()),1)
 on conflict (user_id,bucket,bucket_start) do update
 set used=public.career_ai_usage.used+1 where public.career_ai_usage.used<4;
 if not found then raise exception 'AI minute limit reached'; end if;

 insert into public.career_ai_usage(user_id,bucket,bucket_start,used)
 values(current_uid,'day',date_trunc('day',now()),1)
 on conflict (user_id,bucket,bucket_start) do update
 set used=public.career_ai_usage.used+1 where public.career_ai_usage.used<50;
 if not found then raise exception 'AI daily limit reached'; end if;
 return true;
end; $$;
revoke all on function public.claim_career_ai_quota() from public,anon;
grant execute on function public.claim_career_ai_quota() to authenticated;
