-- Future uploads must validate ownership, actual object existence and scanning
-- before inserting file metadata. Do not let an authenticated browser fabricate records.
drop policy if exists "insert own file metadata" on public.file_metadata;
