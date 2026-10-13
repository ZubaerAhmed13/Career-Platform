# CareerOS — Step 2 current acceptance status

Last reviewed: October 13, 2026.

## Verified backend and preview
- The connected Supabase project \`jtitfwzpfbyfsdpxxrbj\` has **17** successful additive migrations, including account-owned records, evidence, fact reviews, AI turn integrity and specialist interview tracks.
- 11 public tables have RLS. Anonymous table grants are revoked; privileged AI fact persistence is server-only.
- GitHub runs TypeScript/lint, unit tests, actual PostgreSQL 16 migration and RLS assertions, Next.js production build and public desktop/mobile browser smoke tests.
- Vercel deploys the private \`feat/milestone-2-career-vault\` branch to a protected preview. Not merged to production.
- User reported account access working. Authenticated two-account E2E has not been independently completed.

## CareerOS's independent inference engine
- No OpenAI API dependency in the **active inference adapter**: server calls private Ollama \`/api/chat\` with a strict JSON schema.
- Default owned open-weight model: Qwen3 8B. Model weights come from Qwen (Apache-2.0); CareerOS does not claim to have trained the model.
- Private inference configuration: \`SELF_HOSTED_LLM_URL\`, \`SELF_HOSTED_LLM_TOKEN\`, optional \`SELF_HOSTED_LLM_MODEL\`.
- The additional \`SUPABASE_SERVICE_ROLE_KEY\` is solely a restricted database credential for trustworthy AI-source record persistence.
- Private Docker/Caddy HTTPS model-gateway deployment templates and security setup instructions: \`infra/ollama/\` and \`docs/SELF_HOSTED_AI.md\`.
- **The model is not currently running or accessible in Vercel**: no GPU model server or private inference URL is configured. A deployed adapter is not a live model service.

## Remaining release gates
1. Provision an owner-controlled compute server, run Ollama and pull model weights.
2. Configure HTTPS DNS and secret gateway access on the Vercel preview; configure database persistence secret.
3. Run live interview/evidence/quoting cases, failures and two-account security tests with user consent.
4. Deploy private malware scanning for PDF/DOCX or leave binary imports disabled.
5. Finish GDPR data retention/deletion and authenticated mobile/accessibility acceptance.

**Do not merge into main or claim complete private-model runtime before these tests.**


## Secure PDF/DOCX import — scanner-connected source, scanner host pending
- **Built:** 2 MiB PDF/DOCX binary gate, format checks, ClamAV scan-before-parse, strict clean-verdict validation, pending-only CV suggestions, separate AI consent.
- **New (October 13):** The Vercel server action can send binaries to an **authenticated HTTPS scan gateway** (\`CV_SCAN_GATEWAY_URL\` / \`CV_SCAN_GATEWAY_TOKEN\`). Production no longer requires raw, unauthenticated ClamAV TCP.
- **Infrastructure in repo:** \`infra/ollama/compose.yaml\` adds official ClamAV and a minimal, in-memory scan adapter behind Caddy with a **separate token** from Ollama. No TCP 3310 is exposed to the host.
- **Tests:** mocked clean/infected/error scan cases, unauthorized route behavior, request-size restrictions and CI Compose validation. \`infra/ollama/check-scanner.py\` validates live ClamAV using the harmless EICAR fixture when an operator has a real server.
- **Operationally disabled:** No owned scanner server or Vercel scan URL/token is configured. Live malware signature, uptime and PDF/DOCX import acceptance have not been performed.
- **Outstanding defense-in-depth:** dedicated OS-sandboxed parser, two-account browser acceptance, GDPR retention, resource monitoring.
- Setup: [CV scanner runbook](docs/CV_SCAN_RUNBOOK.md). Keep uploads **disabled** until the scanner and real tests pass.


## Step 2 security and lifecycle upgrades — October 13, 2026
- PDF/DOCX **production parsing moved out of Vercel** into a restricted, non-root container behind a private, ClamAV-backed HTTPS \`/extract\` endpoint. The binary is scanned before the separate parser is called, and only bounded text returns to the website. Code and CI can be complete while live scanner operation remains unavailable.
- Added authenticated Career Vault privacy/export page, with owner-controlled and explicitly confirmed career-data clearing; a new additive database migration defines the delete-own-data function.
- No external AI/scanner host or protected runtime secrets have been configured. **Do not claim live Qwen or antivirus operation.**
- Complete acceptance checklist: \`docs/STEP2_RELEASE_GATES.md\`.


**Hosted privacy RPC verified:** Eighteen Supabase migrations have now been applied. The confirmation-gated Vault data-clearing feature is installed; no existing user data was removed during migration. See `docs/STEP2_DELIVERY_REPORT.md`.


## Browser-local CV import — October 13, 2026
- **Added:** local PDF/DOCX extraction with Web Worker, format/ZIP checks, editable text preview, and authenticated *text-only* saving to existing Supabase pending suggestions.
- **Operational distinction:** browser-local extraction needs no scanner/GPU/AI key; the server-scanned import and hosted Qwen interview still require the owner's server. Browser-local parsing is **not an antivirus scan**.
- **Testing:** unit cases for type/ZIP/length gates, real Chromium PDF/DOCX worker extraction with no document POST upload, and existing database/security/build checks.
- Guide: \`docs/BROWSER_LOCAL_CV_IMPORT.md\`.
