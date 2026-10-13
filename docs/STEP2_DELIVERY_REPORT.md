# CareerOS AI — Step 2 Career Intelligence Vault delivery audit

**Review date:** 13 October 2026. **State:** protected Vercel preview; draft PR #2; backend schema active; **not yet production-complete**.

## 1. Repository audit

- Repository: \`ZubaerAhmed13/Career-Platform\`, active branch \`feat/milestone-2-career-vault\`; default \`main\` is not merged or promoted.
- Starting baseline: Next.js 15/React 19, Supabase Auth, private account profile, initial empty Supabase project.
- Prior work across this branch created the manual Career Vault, evidence/link editor, fact review, AI specialist interviewer, private exports and DB migrations; this round hardened document isolation and privacy controls.

## 2. Architecture

Supabase Auth identifies account owners; PostgreSQL RLS plus composite-owner FKs isolate career records, suggestions, evidence, record links and interviews. Privileged source-verification RPCs are invoked server-side, never from browser secrets.

Vercel handles account UX, validated actions and portable export. Qwen3 8B model inference is **self-hosted** via a private Caddy/Ollama server once the owner provisions compute. The ClamAV + extraction system is on the **same private server** but has independent bearer credentials.

The binary pipeline is \`authenticated Vercel server action → TLS /extract → ClamAV INSTREAM → separate non-root parser container → bounded extracted text → pending review → explicit owner approval\`. The parser has a read-only filesystem, no published ports, isolated internal Docker network and CPU/memory/PID restrictions.

## 3. Features implemented

- **Manual Career Vault:** CRUD for work experience, education, skill, language, project, achievement, certification and volunteering. User-provided source and revision data are preserved; date checks reject inconsistencies.
- **Evidence:** Owner-specific notes/links and user-controlled relationships between confirmed facts and supporting evidence.
- **Review:** Separate pending AI/CV claims, evidence quotes, explicit approval/rejection, duplicate detection, corrections, selective field merges (title/description/employer/location/dates), revision checks, intentional separate records.
- **CV text:** Labeled sections are converted into up to six pending factual candidates. Explicit fields can populate employer, location and full ISO dates *only when clearly present in source*. Ambiguous dates remain empty for user correction.
- **CV files:** 2 MiB PDF/DOCX, 12 PDF pages, 4,000 extracted characters, signature validation, DOCX archive expansion checks and mandatory clean malware scan before isolated parsing.
- **Career-only AI:** Eight specialist STAR-E tracks, target-role relevance, model-output schema validation and direct source quote checks, private persistence to the pending queue.
- **Export/erasure:** Owner-only JSON archive; new \`/career-vault/privacy\` with explicit irreversible vault clear action. Login/profile account remains.
- **Dashboard:** Real stored categories, search/filter controls, no fabricated percentages or outcomes.

## 4. Database implementation

**18 applied migrations** in project \`jtitfwzpfbyfsdpxxrbj\`, including the original account setup, vault schema, review and conflict handling, AI quota/provenance, source security, indexes, exact AI turn mapping, eight interview tracks and \`vault_erasure\`.

Verified live: 11 RLS-protected public tables, anonymous table grants revoked, service-only AI provenance RPC, owner-only clearing RPC granting execution to \`authenticated\` but not \`anon\`. A local disposable PostgreSQL 16 CI suite applies all numbered migrations and runs owner-isolation, approval/merge, provenance, quota, reply and erasure assertions.

The Supabase management connector assigns migration version identifiers different from local filename prefixes. Before any future CLI migration, reconcile versions to prevent reapplication.

## 5. AI integration

The application no longer requires OpenAI, Google or another paid hosted model API. It calls only an authenticated HTTPS Ollama endpoint running open-weight \`qwen3:8b\`. Its origin and secret are server environment variables, not browser variables. Prompts bound to specialist career scope, schema checks, exact source-quote checks, unsupported numbers and user approval reduce hallucinated career data.

**Live inference has NOT been activated.** There is no connected owner-controlled model host; no claim of a real Qwen interview or benchmark is justified. The Vercel Preview still lacks private inference/gateway credentials and Supabase's server-side persistence key.

## 6. PDF/DOCX import

Files are never stored publicly or served as downloadable originals. The active production code now sends uploaded binary bytes only to a private \`/extract\` gateway. The gateway scans them and forwards **only clean files** to an isolated, non-root parser; only text comes back to the Next.js app.

Tests include simulated ClamAV clean/infected/down/invalid verdicts, scans rejecting unauthenticated access, scan-before-parse ordering, bad file magic, DOCX ZIP limitations, real local PDF/DOCX extraction and a Docker-built parser test.

**Live antivirus scanning remains disabled/unverified**, because the user has not connected a Linux model/scanner host, current ClamAV signatures or HTTPS/DNS endpoint. OCR of image-only PDFs is not implemented, and real-world parser penetration/resource tests remain a release gate.

## 7. Security and account isolation

- Supabase RLS and explicit client grants are installed.
- Disposable PostgreSQL CI enforces owner isolation and cross-owner relationship rejection, user-only revisions, server-only AI provenance and owner-scoped erasure.
- Authenticated two-account **real Supabase staging** tests are written but **not executed**. This is not equivalent to the local PostgreSQL fixture.
- Account clearing requires typed text plus confirmation. It does not itself delete login credentials or operational backups; account/data retention policy needs operator review.

## 8. UI, responsive and accessibility

Navigation includes the Vault, evidence and relationships, fact review, specialist interviewer, export and privacy page. Desktop and mobile Chromium smoke checks run in CI and test anonymous route protection and public layouts. Full authenticated mobile/keyboard/screen-reader use is still outstanding.

## 9. Automated verification

Workflow \`.github/workflows/ci.yml\` runs:
- \`npm run typecheck\`, \`npm run lint\`, \`npm test\`, \`npm run build\`
- \`psql\` migration execution plus owner and AI security assertions
- \`node --test infra/ollama/scan-server.test.mjs\`
- \`node --test infra/ollama/cv-parser.test.mjs\` and **Docker build/run** of isolated parser container
- \`npm run test:e2e\` (anonymous desktop/mobile Chromium)

**These source tests do not imply the external model/antivirus infrastructure is running.**

## 10. Known issues and release blockers

1. No owner-controlled model/scanner server; currently Vercel has no \`SELF_HOSTED_LLM_URL/TOKEN\`, \`CV_SCAN_GATEWAY_URL/TOKEN\`, or \`SUPABASE_SERVICE_ROLE_KEY\` configured.
2. No real hosted Qwen3 inference or model-quality acceptance.
3. No live malware-signature, benign/EICAR or signed-in PDF/DOCX upload acceptance.
4. No dedicated Supabase staging project with two authenticated disposable users for cross-account browser testing.
5. Full account deletion, backup retention/privacy documentation and logged-in accessibility audits pending.
6. Parser transitive dependencies and base images should be pinned to immutable digests/lockfiles after reviewed security release versions; threat simulation remains valuable before public use.
7. The section parser supports explicitly labeled metadata but cannot reliably extract all fields from arbitrary unstructured CVs; those need model-assisted review or manual correction.

## 11. Pull request

Draft [PR #2](https://github.com/ZubaerAhmed13/Career-Platform/pull/2) remains open and deliberately **not merged** into \`main\`. CI/preview deploy automatically from reviewed feature-branch commits. Do not promote to production solely because the build is READY.

## 12. Readiness for Step 3 (Resume Studio)

**Not yet accepted.** Manual Career Vault and persistence infrastructure can support further development, but the Step 2 final acceptance criteria explicitly require live interview/CV import where enabled, real cross-account authorization checks, accessible UI, and no silent data corruption. Complete the operator and staging gates in \`docs/STEP2_RELEASE_GATES.md\` before using the Vault as an approved source for automatic resume/cover letter generation.


## Supplemental delivery: browser-local PDF/DOCX extraction
The review screen has a Web Worker-based alternative to scanner-dependent uploads. It processes text PDFs/DOCX locally (2 MiB, 12 PDF pages, checked DOCX ZIP limits), shows an editable text preview, then posts only explicitly approved text to an authenticated server action that persists up to six pending facts via Supabase. This avoids extra scanner infrastructure for personal document review but does not offer ClamAV antivirus guarantees. Signed-in data persistence and production browser acceptance are separate from mocked/local CI checks. See \`docs/BROWSER_LOCAL_CV_IMPORT.md\`.
