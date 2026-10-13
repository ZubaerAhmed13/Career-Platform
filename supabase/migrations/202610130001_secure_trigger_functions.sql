-- Remove direct API execution from internal trigger functions.
-- Their owning table triggers continue to execute normally.
revoke all on function public.initialize_user_profile() from public,anon,authenticated;
revoke all on function public.log_career_record_change() from public,anon,authenticated;
