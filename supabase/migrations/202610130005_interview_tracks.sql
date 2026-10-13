-- Persist the user's chosen professional interview track across devices.
alter table public.career_interview_sessions
 add column if not exists topic text not null default 'experience'
 check (topic in ('experience','achievements','projects','skills','education','languages','certifications','volunteering'));

create index if not exists career_interviews_owner_topic
 on public.career_interview_sessions(user_id,topic,updated_at desc);
