# CareerOS AI — independent open-weight model deployment

## What independence means

**No OpenAI, Anthropic, Google, Vercel AI Gateway, or other paid inference API is used.**
CareerOS AI runs its interview and CV extraction workflows using model **weights hosted on a server controlled by the owner**. The initial model is **Qwen3 8B** (Apache-2.0 licensed open weights, obtained separately), served by **Ollama**. It is not a newly trained-from-scratch foundation model and the weights are authored by Qwen, not CareerOS.

The CareerOS web app stays on Vercel and career profiles stay on Supabase. These hosting/database dependencies are not AI inference services. Self-hosting **does not mean free computing**: the server, electricity, network, maintenance, backup and monitoring cost money. The server operator alone controls training data/retention and access.

## Architecture

\`\`\`
User / protected CareerOS preview
        |
     Next.js server action [requires signed-in user + explicit processing consent]
        |                         |
        |                         +-- Supabase RLS / review queue / service-only provenance RPC
        |
        | TLS + server-only bearer authorization
        v
    Caddy HTTPS gateway (restrict POST /api/chat only)
        |
        | Docker private bridge network, no exposed Ollama port
        v
    Ollama running qwen3:8b weights on owner-controlled CPU/GPU
\`\`\`

There is **no external model fallback**. If the owned model server is unavailable, interview generation fails closed, while manual Career Vault editing and previously saved interviews remain accessible.

## Private model-server setup (own GPU VM or private server)

1. Provision your own Ubuntu/Debian server with Docker and Docker Compose. The Ollama 8B Q4_K_M package weighs about 5.2 GB; runtime memory and KV cache need more. A modern GPU with roughly 12–16 GB VRAM is a practical starting point, subject to actual context/concurrency tests. CPU-only is possible but often slow. The initial server is a starter, **not a tested scaling configuration**.
2. Configure a DNS hostname you control such as \`career-model.example.com\` to point at the server. Restrict management access, enable OS updates and firewall rules. Permit inbound TCP 80/443 for automatic TLS issuance but **never publicly open TCP 11434**.
3. Review and pin supported Ollama/Caddy container image versions or immutable digests. In \`infra/ollama\`, copy \`env.example\` to \`.env\`. Replace image versions, \`MODEL_DOMAIN\`, and \`INFERENCE_BEARER_TOKEN\`. Generate a long random token with \`openssl rand -hex 32\`; keep the value only in local secret storage and Vercel's protected environment settings. Never commit \`.env\`.
4. Run \`docker compose -f compose.yaml -f compose.gpu.yaml up -d\` with the NVIDIA Container Toolkit installed. For CPU-only trials, use \`docker compose -f compose.yaml up -d\`.
5. Load the independent open-weight model by running \`docker compose exec ollama ollama pull qwen3:8b\`. Verify using \`docker compose exec ollama ollama list\`. Check the license/terms for any different weights you choose.
6. Test privately with an authenticated request and a **JSON-schema** \`format\` payload sent to \`https://<model-domain>/api/chat\`. First test should use a dedicated developer shell and never put tokens into shell history or logs. Expect JSON in \`message.content\`, \`done:true\`, and no redirect. The gateway returns 403 for missing/incorrect tokens and other routes.
7. Configure protected **Vercel Preview environment variables** under the \`career-platform\` project:
   - \`SELF_HOSTED_LLM_URL=https://<model-domain>\` (HTTPS origin only, no path).
   - \`SELF_HOSTED_LLM_MODEL=qwen3:8b\`.
   - \`SELF_HOSTED_LLM_TOKEN=<same private random gateway token>\`.
   - \`SUPABASE_SERVICE_ROLE_KEY=<Supabase privileged server key>\` — *still needed for verified provider-origin fact persistence*. It is a database credential, **not an OpenAI or model-provider credential**.
   - Continue using the existing \`NEXT_PUBLIC_SUPABASE_*\` settings. **Never prefix the private keys above with \`NEXT_PUBLIC_\`**.
8. Redeploy the protected feature-branch preview. Register/login, start a career interview, consent to processing, and answer one real career question. Confirm that the local model asks exactly one targeted follow-up, a source-backed proposal enters the pending review queue, and the user can reject/approve it. Verify two-user RLS and error/timeout handling before production release.

## Ollama request contract

The Next.js server uses the Ollama native \`POST /api/chat\` API with \`stream:false\`, \`think:false\`, a JSON schema in \`format\`, and low temperature. The existing Zod validators and SQL service-RPC checks still independently reject malformed, unsupported, fabricated, or duplicate claims. All information sent for modeling is the signed-in user's consented interview/CV text and bounded approved context.

## Security, operational limitations, and honest acceptance

- Ollama's default local port is **not an authenticated public API**. It stays inside the private Docker network. A restrictive TLS gateway enforces a random bearer token **and exposes only the chat route**.
- Use an owner-controlled, well-maintained, EU-region server if EU data-residency matters. Self-hosting avoids third-party model inference but **does not automatically satisfy GDPR**: account deletion, retention, logs, backup policy, contracts, monitoring and data access still matter.
- Do not expose the gateway token to the browser. Rotate credentials if leaked. Limit inbound addresses, add firewall/reverse-proxy rate limits/monitoring where feasible, keep container versions patched, pin the weight revision, and budget GPU capacity for worst-case load.
- The server has no web browsing or tool permissions. Applicant text is untrusted input, and extracted facts require direct quotes, numeric consistency checks, domain-scoped prompts and human approval.
- Production URL must be HTTPS with a strong backend token; local HTTP is permitted only to a loopback process in a nonproduction Node runtime. Redirections are rejected to prevent leaking credentials.
- A local-model adapter unit test does **not** mean real Qwen weights are running. Independently verify the model server, latency, memory, TLS/gateway access control, private logs and live model quality before claiming full independence operationally.
- Maintaining a model on this infrastructure is substantially different from training a new foundation model; no custom training weights are created here.

### Verified references
- Ollama model: https://ollama.com/library/qwen3:8b
- Ollama structured JSON output: https://github.com/ollama/ollama/blob/main/docs/capabilities/structured-outputs.mdx
- Original Qwen3 model license: https://huggingface.co/Qwen/Qwen3-8B
