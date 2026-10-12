# CareerOS CV scanning runbook

## Status
Source implementation is available, but **not activated or verified** against a live scanner or Supabase. No public document-upload endpoint should be exposed before staging security acceptance.

## Scanner deployment prerequisite
Provision a managed, up-to-date **ClamAV clamd** service inside a private, application-only network. Keep malware definitions updated; prevent direct public access to TCP 3310. Ensure the daemon's INSTREAM feature and StreamMaxLength allow at least 2 MB. Configure `CLAMAV_HOST` to the private service name/IP and `CLAMAV_PORT` if different from 3310. Do not set these variables merely to enable a UI without a real scanner.

The app sends the bytes using ClamAV's zINSTREAM protocol, requires an explicit `stream: OK` verdict, and rejects infected, inconclusive, timed-out, unreachable or unconfigured scans. Only after a clean verdict does it parse a small PDF or DOCX in memory. Original binaries are discarded rather than saved into storage.

## Resource and format limits
- Up to 2 MiB input; extension must match file signature.
- PDF: 12 pages maximum, bounded PDF image allocation, plain text only; scanned-image PDFs with no text are rejected (no OCR).
- DOCX: ZIP central directory must contain the expected Word components, reject declared suspicious expansion, encrypted entries, macro filename and many ZIP entries. These checks are defense-in-depth **not a proof against all decompression bombs**.
- Extracted text must be 20–4,000 characters and goes to an unreviewed career suggestion. Users review, reject, edit or explicitly approve/merge it.
- No original file persistence, no public file bucket and no file-download URL.

## Required before production
1. Verify antivirus updates and signatures, private networking/firewall, ClamAV scan reply behavior with known harmless files and a standard harmless antivirus detection test fixture.
2. Test scanner-down, timeout, abnormal reply, encrypted DOCX, ZIP bombs, oversized PDFs and scanned image PDFs; all failures must preserve existing confirmed records.
3. Isolate parsing in a separately resource-limited worker/container before accepting untrusted public uploads; source-only parser bounds are not an OS security sandbox.
4. Apply and validate migrations 001–006 on backed-up staging Supabase. Verify two-user Row-Level Security and review merge RPC behavior.
5. Manually verify mobile/keyboard UI, correct user consent, browser form behavior, security logs without raw CV data, retention, privacy policy and GDPR/legal review.

If any requirement is unfulfilled, leave uploads disabled by keeping `CLAMAV_HOST` unset.
