# Career evidence and relationships

A `career_record` has a stable UUID, owner, category, confirmed/unreviewed/conflict status, provenance, dates, free-text description, JSONB details, and an optimistic revision counter. `career_evidence` is a separately owned source note, URL or document reference; the actual private document upload pipeline is deliberately disabled. The join table `career_evidence_links` associates evidence with records through **two composite foreign keys**. `career_links` links two record UUIDs from the **same account**, enforced by composite foreign keys (id, user_id) to the source and destination records.

A `career_suggestion` is a separately reviewed potential fact (origin AI or pasted import). An atomic, authenticated SQL function approves it into a new record; rejected suggestions do not modify confirmed career information. Suggestions with matching titles should be reviewed for duplication first. Audit events are produced by a database trigger for record insert, update and delete.

Deleting a career record removes only association rows through ON DELETE CASCADE; independent evidence and unrelated records remain. Audit events preserve prior values for the owning account. Do not expose audit records in public search results or logs. User data export includes explicitly owned data, never provider tokens or secret keys.

Future tailored resume versions must reference stable career record IDs and never change the originals.
