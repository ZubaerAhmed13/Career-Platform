# Step 2: Career Intelligence Vault — release gate and honest completeness report

**Date:** October 13, 2026. This is a working feature branch, **not an approved production release**. Do not begin Resume Studio or merge the PR until each operational blocker below is validated.

## 1. Verified and implemented

- Eight source-of-truth career categories with authenticated server-side CRUD.
- Permanent record provenance, revision checks and activity history.
- Owner-scoped evidence, supporting sources, links and professional interview sessions.
- Review/approval, comparison, selective merges and duplicate warnings for AI and CV facts.
- Section-labelled CV import, with only pending fact suggestions and separate AI consent.
- PDF/DOCX format and resource limits, ClamAV scan-before-parse, and **new isolated parser worker**; all fail closed when the private scanner is absent.
- Specialist career-only STAR-E interviewing and private Qwen3/Ollama model *adapter*, with no paid model API dependency.
- Owner-only JSON data export and confirmation-gated Career Vault clearing (erasure RPC deployed and verified in Supabase).
- Private Vercel feature-branch preview; existing 18 migrations already deployed to Supabase.
- GitHub CI: application/static tests, real PostgreSQL migration/RLS smoke tests, public Chromium desktop/mobile checks, and parser Docker image build/smoke.

## 2. Outstanding infrastructure and acceptance gates

| Blocker | Required verification | Operator |
|---|---|---|
| Independent model runtime | Provision trusted owned host, run Qwen3, verify structured live interview against real submitted facts, failure modes and privacy | Owner provides compute; ChatGPT assists configuring |
| Secure document runtime | On that host, deploy Caddy + ClamAV (current signatures) + isolated parser; verify clean PDF, DOCX, EICAR, corrupt/oversized files and outages | Owner provides host/DNS; ChatGPT tests/configures |
| Private secrets | Configure \`SELF_HOSTED_LLM_URL/TOKEN\`, \`CV_SCAN_GATEWAY_URL/TOKEN\`, and \`SUPABASE_SERVICE_ROLE_KEY\` securely in **branch-scoped Vercel Preview** | Owner/provider secret UI, never chat |
| Actual two-account Supabase RLS | Create distinct disposable accounts in a **dedicated staging project**, then run protected integration tests and confirm cross-user data invisibility and immutable provenance | Authorized staging infrastructure |
| Signed-in browser end-to-end | Signup, login, record CRUD, refresh/relogin, evidence, approval/reject/merge, export, data clearing, mobile a11y and screen reader audit | Staging accounts and browser access |
| Model quality | At least 12 professional cases from \`docs/CAREER_AI_PRO_ACCEPTANCE.md\` pass without invented facts; quantify cost/latency and data-retention rules | Live model |
| Binary-parsing robustness | Validate isolated parser with real-world PDFs, DOCX, corruption cases, hanging/decompression edge cases, antivirus update/outage | Live scanner/worker |
| Deletion/privacy policy | Document personal-data retention, backup expiry, account deletion service process, support contact and GDPR disclosure | Owner/operator |

## 3. Immediate acceptance sequence

1. Run GitHub CI and check the exact source commit.
2. Apply only additive, previously uninstalled Supabase migrations after checking migration history and data.
3. Prepare owner-controlled server and HTTPS DNS. Use \`docs/SELF_HOSTED_AI.md\` and \`docs/CV_SCAN_RUNBOOK.md\`. Generate secrets on the server and enter them into Vercel's secure environment settings **without sending them to ChatGPT**.
4. Run \`python3 check-gateway.py\` and \`python3 check-scanner.py\` on the server; both must pass.
5. Verify real signed-in CV import and career interview. Both must create pending facts without ever silently confirming.
6. Validate two-user isolation in staging, keyboard/mobile/browser behavior and retention/deletion.
7. Only then merge and release.

## 4. Why operational completeness is not yet claimed

A public repository test that mocks an AI response or antivirus verdict is not a live language model, a malware scanner, or a full account security test. The deployed Vercel preview can be \`READY\` even if its private inference/scanner secrets are deliberately missing. We will not create fictitious test results or disable safeguards to make the UI appear complete.


## Browser-local CV alternative — added October 13
CareerOS now offers a separate **no-scanner-required** PDF/DOCX text extraction workflow in the browser, with editable preview and pending Supabase review. It does NOT require the private scanner or model server. No original file bytes are submitted. This allows signed-in users to populate the manual Vault via real CV files while waiting for independent AI hardware. Security scope is different: it provides privacy-first parsing in a Web Worker, **not malware scanning**; the optional server-upload route must stay disabled until ClamAV is deployed. Signed-in browser acceptance for actual Supabase persistence and cross-account protection remains a release gate.
