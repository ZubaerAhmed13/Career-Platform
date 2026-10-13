# CV import pipeline — staged release plan

**Current verified scope:** user may paste 20–4,000 characters of existing CV or other career text and explicitly classify it. CareerOS stores that original text in a pending review item. This is **not automated CV parsing or an uploaded file** and cannot silently replace a confirmed record.

**New conditional implementation:** PDF/DOCX binary text extraction using unpdf and mammoth, *only after* a clean real clamd INSTREAM antivirus result. File size, format signature, PDF page count, and DOCX ZIP directory expanded-size limits are enforced in source. Extracted text is unreviewed; the original binary is never stored. This code has passed build/unit checks but has not been tested with an actual scanner or live Supabase instance.

**Still not implemented/verified:** OCR, binary document persistence/downloads, field-by-field PDF extraction/merge, advanced resume metadata, malware sandbox and full scanned-file E2E. A functional scanner service is a hard dependency, not an optional warning. These are blocked until secure private object ingest, scanning, per-owner policies, file limits, MIME and magic-byte checks, sandboxed parsers, storage retention and external provider credentials are ready.

**Future review pipeline:** upload to private quarantine → scan → extract text → structured schema parsing → match candidate employers/titles/dates to existing verified records → show per-field evidence/conflicts → keep existing / accept new / merge selected fields / save separately / cancel → commit only explicitly approved changes in a transaction. Uploaded originals remain unchanged and user-owned. Never publicly serve uploaded CV documents by default.

## Optional AI text extraction implementation
When `OPENAI_API_KEY` is configured, the review page also offers a user-consented text-only AI extraction. It uses a specialized prompt with schema validation and source-quote matching, then displays only pending proposals. Users can edit proposals, reject them, create new facts, or merge selected fields after checking the original. No original confirmed record changes merely because text was pasted or AI parsed it.

See `docs/CV_SCAN_RUNBOOK.md` for fail-closed scanner configuration and deployment checks.

## Verified AI extraction provenance
When structured AI extraction is requested, source-quoted proposals now pass through a service-role-only transactional Supabase function. User-authored pasted text uses `origin='cv_import'` while provider-created facts use `origin='ai'`; both still require separate explicit review and approval. An API key alone cannot enable trusted AI functionality: configure secure database persistence too.

## Conditional scanned-file structured extraction
After a real clean ClamAV verdict, a user may choose **manual review** (one pending original-text entry, no AI transfer) or select **AI-assisted field proposals** with distinct permission to send extracted text to the provider. AI requires the configured model, database quota RPC and server-only trusted persistence. Up to six quote-backed facts become pending suggestions, never confirmed records. If the provider fails, no success is claimed and the user can retry with AI extraction unchecked. No original binary is saved.


## October 2026 implementation: structured manual review
The non-AI section parser now recognizes specific labeled CV sections and creates separate review proposals instead of treating every uploaded/pasted CV as one job. Every saved proposal includes a source excerpt appearing in the supplied text; if extraction is uncertain, the original can remain one pending item. A maximum of six proposals are created per import and omitted entries are reported.

Migration 012 adds editable employer/institution, location, start date, end date and ongoing status to unconfirmed proposals. Each proposed record remains private and unconfirmed until the owner approves it. Users may reject it, correct it, keep an original record, merge only selected fields or explicitly save a genuinely separate same-titled record. Normal approval rejects a duplicate same-title/category record; the separate path requires a confirmation checkbox and owner-scoped SQL action.

**Limitations:** the parser does not infer employer/dates from unstructured text, preserve a binary original for replay, parse images/OCR, or automatically guarantee accurate field-level extraction. AI proposals also require manual correction of their structured fields. This is a safer intermediate import workflow, not fully automatic CV understanding. Real AV scanner/hosted database tests remain unexecuted.
