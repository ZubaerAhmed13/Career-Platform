# CareerOS PDF/DOCX antivirus activation

**Status:** The fail-closed scan integration is implemented. It is not operational until a real ClamAV server and its up-to-date signatures have been deployed, tested and connected from Vercel.

## Architecture

Browser (authenticated) → CareerOS Next.js server action → private authenticated HTTPS scanner gateway → internal Node adapter → official ClamAV `clamd` TCP 3310 (never internet-facing).

A clean `stream: OK` verdict is required **before** parsing. The scanner sidecar holds input bytes in memory, does not persist original uploads or log document content, and sends back only `{"clean":true}` for clean files. Infected/inconclusive uploads and scanner outages are rejected. Normal CV section extraction works without an AI model; AI extraction has separate consent and requires the self-hosted Qwen model.

## What the owner must do

1. Provision a controlled Linux host with Docker and at least 4 GB of RAM available for ClamAV *in addition to* model/runtime resources. Choose supported ClamAV and Node image tags; do not use an unsupported end-of-life release.
2. Set up an HTTPS DNS name and keep only ports 80/443 reachable; **never publish port 3310**. The existing `infra/ollama/compose.yaml` includes `clamav` and `scan-gateway` services on a private Docker network, protected by Caddy.
3. On the host, run `bash infra/ollama/setup.sh` (only if no prior `infra/ollama/.env`). It now generates a *separate* random `CV_SCAN_BEARER_TOKEN`. If you have an existing `.env`, **do not overwrite it**; add `CLAMAV_VERSION`, `SCAN_NODE_VERSION` and a newly generated `CV_SCAN_BEARER_TOKEN` privately.
4. Start Docker Compose, allow ClamAV signatures to initialize, and verify daemon/definition updates. Run `node --test infra/ollama/scan-server.test.mjs` as a local adapter test. **That test uses mocked scanner connections**, not the real ClamAV database.
5. Execute a *real* authorized HTTPS scanning test for a benign PDF and the harmless EICAR antivirus test fixture. Verify HTTP 200 only for the benign file and blocked results for detected malware, corrupted archives, overload and server-down conditions. Do not test using real malware.
6. In Vercel `career-platform` preview for `feat/milestone-2-career-vault`, set `CV_SCAN_GATEWAY_URL=https://<owned-model-domain>` and `CV_SCAN_GATEWAY_TOKEN=<separate scan token>` as **server-only environment variables**. Redeploy the feature branch. Verify actual browser uploads with two independent users.

The `CV_SCAN_GATEWAY_*` variables remain **unset** until this deployment is working. The upload interface must remain disabled rather than bypass the scanner.

## Defense in depth and remaining release checks

Input limited to 2 MiB, 12 PDF pages, 4,000 extracted characters; file signature matches the extension. DOCX ZIP directory uses declared expansion limits; no OCR or public binary storage. A scanner is **not** a parser sandbox: PDF/DOCX parser isolation in a dedicated resource-restricted worker/container is still outstanding before accepting untrusted uploads broadly. ClamAV only recognizes threats covered by its signatures and engine.

Official guidance: https://docs.clamav.net/manual/Installing/Docker.html and https://docs.clamav.net/manual/Usage/ClamdProtocol.html.


## Isolated parser upgrade — 13 October 2026

The new production upload path is a two-stage private gateway:
1. Vercel receives the authenticated user's PDF/DOCX (up to 2 MiB) and identifies the format.
2. Vercel sends the original bytes only to the protected HTTPS \`POST /extract\` endpoint with a dedicated scanner bearer token.
3. The private scan adapter calls ClamAV over an internal-only Docker network. A non-clean verdict, timeout or unavailable scanner rejects the request **without parsing it**.
4. Only clean bytes are forwarded to \`cv-parser:3089\` across the separate \`parse-internal\` Docker network. The standalone parser has a read-only filesystem, non-root UID, dropped Linux capabilities, PID/CPU/memory bounds, and no general internet connectivity.
5. The restricted parser checks PDF/DOCX signatures and directory/page/expanded-size limits and returns only text and verified format; no document binary is stored or returned.
6. The adapter returns \`{"clean":true,"format":"pdf"|"docx","text":"..."}\` to Vercel. The application checks the response and stores only up to six **pending** facts awaiting explicit user review.

For local development, a direct clamd path can still parse in-process. **Production never parses the untrusted document in the Next.js process.**

### Private parser image
- Source: \`infra/ollama/cv-parser.mjs\`
- Container build: \`infra/ollama/Dockerfile.cv-parser\`
- Docker Compose service: \`cv-parser\`, bound only to \`parse-internal\` network; no published host port
- Dependencies: \`mammoth@1.13.0\`, \`unpdf@1.8.1\` (review/pin their transitive dependency lock or immutable artifact digests before production)
- Development tests: \`node --test infra/ollama/cv-parser.test.mjs\`; CI builds and tests the parser image without external network access at test time.

**Still required to activate:** an owner-controlled server actually running ClamAV, current antivirus definitions, the parser worker, Caddy TLS authentication, live clean PDF/DOCX tests, harmless EICAR detection, confidentiality checks, accessible review UX, and monitored error/timeout/denial paths. Malware scanning is an additional layer, **not** a mathematical guarantee of document safety.

