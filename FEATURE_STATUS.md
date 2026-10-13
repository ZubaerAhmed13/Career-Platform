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
