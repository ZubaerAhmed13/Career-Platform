# CV import pipeline — staged release plan

**Current verified scope:** user may paste 20–4,000 characters of existing CV or other career text and explicitly classify it. CareerOS stores that original text in a pending review item. This is **not automated CV parsing or an uploaded file** and cannot silently replace a confirmed record.

**Not implemented:** PDF/DOCX uploads, antivirus/document scanning, OCR, field-level extraction, duplicate/conflict reconciliation, resume metadata extraction and approved file-download links. These are blocked until secure private object ingest, scanning, per-owner policies, file limits, MIME and magic-byte checks, sandboxed parsers, storage retention and external provider credentials are ready.

**Future review pipeline:** upload to private quarantine → scan → extract text → structured schema parsing → match candidate employers/titles/dates to existing verified records → show per-field evidence/conflicts → keep existing / accept new / merge selected fields / save separately / cancel → commit only explicitly approved changes in a transaction. Uploaded originals remain unchanged and user-owned. Never publicly serve uploaded CV documents by default.
