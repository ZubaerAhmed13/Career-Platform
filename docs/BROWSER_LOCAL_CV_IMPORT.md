# Browser-local PDF/DOCX import — Step 2

## What is available

The Career Vault review page now includes **Import PDF or DOCX on this device**. This uses the same connected Supabase backend already storing the user's career facts. It does not require a ClamAV server, an AI key, a GPU or a new database migration.

1. Open **Career Vault → Review before saving** after signing in.
2. Choose a text-based PDF (up to 12 pages, 2 MiB) or standard DOCX (up to 2 MiB).
3. Click **Extract text locally**. CareerOS reads the file in a temporary browser Web Worker, using the bundled PDF.js-based unpdf library and Mammoth's browser build. No original file is sent to Vercel, Supabase Storage or any AI service.
4. Review the entire extracted text through sequential editable parts of at most 4,000 characters each. The original source is represented without truncation when partitioned; original section headings may repeat as context across part boundaries. Image-only PDF text cannot be imported yet; no OCR is performed.
5. Choose a fallback category, inspect each part, explicitly confirm your right to use its text, and click **Save selected text to my review queue** for each part. A saved-parts progress meter tracks this browser session; unsaved edits are lost if the tab is closed.
6. Only text from the specific part you approve is sent to the authenticated server action. Each part is bounded to 4,000 characters; the server validates user, account and hourly limit, conservatively splits recognizable headings into up to 20 candidates, and writes to existing `career_suggestions` rows with `origin='cv_import'` and `review_status='pending'`. If a part has too many candidates, it is rejected without saving anything; split it smaller and retry.
7. Inspect each suggestion and correct, approve, merge, or reject. **No candidate is confirmed automatically.**

No file, document filename or binary data is included in the new server action's payload. The browser parses locally; it is not allowed to send files as form values. Server-side privacy review checks that every saved quote appears in the selected text.

## Limits and security

- Text-based PDF or DOCX only; 2 MiB document limit, 12 PDF pages, at most 100,000 locally extracted characters and at most 4,000 submitted text characters per part. Default pasted-text intake remains limited to 4,000 characters and six suggestions.
- DOCX validation checks ZIP central-directory limits, expanded entry sizes, encrypted/macro content flags, structure, and extension/magic byte consistency before decompression.
- Parsing happens in a temporary browser Web Worker and terminates on completion/error/timeout. PDF/DOCX parsing runs in the user's browser, so untrusted files can still exploit browser/parser vulnerabilities. **This is not antivirus scanning and is not equivalent to ClamAV.** Users should open files they trust.
- Browser OCR is not supported. The application intentionally does not invent employers, metrics, roles or dates.
- No paid AI model or credential is needed to use this workflow. The separate CareerOS private Qwen AI interviewer remains unavailable until its model server exists.
- There is an independent **server-scanned** import option for future high-assurance use; it stays disabled until an operator provides and tests the private ClamAV service.
- A development-only fixture route at `/local-cv-fixture` is accessible only in development builds; production returns 404. Browser CI feeds local sample PDF/DOCX documents to the real worker and verifies that extraction causes no POST uploads.
- The authenticated text save path reuses existing per-account row-level security. User consent is required. A live signed-in end-to-end save still requires separately testing an actual account browser session.

## Backend ownership

Supabase remains CareerOS's primary server-side backend: Auth, permanent verified career records, review history, links and evidence, persistent interview history, audit events and owner-only export/erasure. The local browser worker is **only a document-text parser**. Vercel serves the UI and authenticated text-only server action; it does not store original uploaded files. No new Edge Function or PostgreSQL migration was needed.

## Operator acceptance

- Check the browser UI on a signed-in desktop and mobile browser with a real text PDF and DOCX.
- Confirm only selected text is transmitted in the save operation (browser Network panel) and no original file bytes reach a server.
- Confirm pending suggestions are stored in the correct Supabase user account and remain invisible to another user.
- Confirm rejecting/approving proposals preserves career provenance, version checks, exports and erasure operations.
- Keep ClamAV-dependent server imports disabled until a private scanner is available.

Document processing here is a **privacy-preserving convenience workflow**, not a guarantee that every arbitrary PDF or DOCX is malware-free.


## Tested status (13 October 2026, existing workflow)

**PR #4 extension (15 October 2026):** full-length multi-part browser review and no-truncation checks added in source; new tests and CI must pass before describing this extension as verified on `main`. Browser E2E for extraction is separate from authenticated Supabase saving.
- The latest branch has passed Playwright tests on desktop Chromium and mobile Chromium that load real, harmless sample text-PDF and DOCX documents in the local browser worker, check the editable extracted-text preview and assert there is **no HTTP POST while extracting**.
- Unit tests validate extensions/magic bytes, DOCX directory bounds and safe selected-text lengths. Existing GitHub CI validates the signed-in server action's build, Supabase migrations and database RLS fixtures.
- The **actual save with a signed-in Supabase account** has not been automated or independently observed. No real personal document was uploaded in tests. A user must still confirm their selected text before the server action saves pending proposals.
