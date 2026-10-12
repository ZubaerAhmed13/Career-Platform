# Career Vault — implementation scope

The Career Intelligence Vault is CareerOS's permanent source of owned career information, not a generated resume. It preserves the account module, login, session guard, theme, and existing placeholders for later modules.

## Implemented in the pull request
- Manual CRUD for eight categories: experience, education, skill, language, project, achievement, certification, volunteering.
- Search/filter on saved records; optimistic revision checks for conflicting simultaneous edits.
- User-owned supporting notes/URLs and owner-consistent record/evidence relationships.
- Unreviewed career fact queue. AI proposals are never applied without explicit approval.
- Secure review RPC: approve creates a new confirmed record in one database transaction; reject does not change confirmed records.
- Text-only intake of personally pasted resume material for review (no claim of automatic parsing).
- Optional AI interview sessions with a genuine configured service, conversation history and a strict schema; unavailable without an API key.
- Authenticated JSON export of owned career data, including records, evidence, links, suggestions, sessions, messages and audit events.
- Dashboard overview showing data returned from real career tables.

## Not finished
PDF/DOCX scanning, document uploads, OCR, automated extraction/deduplication with field-level merge, detailed multi-device E2E, full version rollback UI, complete German interface and exhaustive localization, production rate limiting and privacy-rights workflows. These are planned/blocked and not marketed as live.

## Integrity
Manual saves are confirmed facts owned by the authenticated user; unreviewed data remains separate. Import/AI suggestions never overwrite a confirmed record. Linked IDs use composite FK constraints with the same user_id; RLS restricts all exposed tables. Record revision requires matching version when editing, rather than silently overwriting a concurrent change. Deleting a record cascades only its associations, preserving unrelated records and standalone evidence.

## Conflict review refinements
Reviewers can correct pending suggested title/description/category or explicitly choose an existing confirmed record and which fields to merge. The merge RPC locks both proposal and target record, checks account ownership, matching category and expected revision, then records the audited update in one database transaction. Keeping the original record or rejecting the proposal remains available; unrelated fields are not modified.
