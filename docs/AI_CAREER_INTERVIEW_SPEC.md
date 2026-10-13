# CareerOS independent AI — specialist interview and CV evidence

**Engine:** Self-hosted Qwen3 8B open-weight language model running through Ollama. The CareerOS application sends no inference requests to a commercial AI provider. See [Self-hosted AI](SELF_HOSTED_AI.md).

## Permitted operations
- \`career_interview\`: eight professional tracks, STAR-E follow-ups, scope classification, next-question focus, and at most two evidence-backed pending suggestions per response.
- \`career_cv_paste\`: at most six evidence-backed pending proposals from a manually provided or antivirus-extracted CV text.

## Security and information flow
1. A signed-in user selects a career track and gives explicit consent for model processing.
2. The server retrieves a bounded number of confirmed career facts, optional target role and recent interview turns.
3. The private, owner-controlled Ollama model receives these as untrusted context with a server-owned career-only instruction and strict JSON schema.
4. App-level validation rejects incorrect schema, off-topic suggestions, unmatched excerpts, invented numbers and unsupported or duplicate claims.
5. Only the backend can call service-role SQL functions, tying AI responses to exact user messages and storing suggestions as pending.
6. The user must approve or correct a proposal before it becomes a confirmed Career Vault record.

The model has no tools for browsing, sending job applications, writing to the database or accessing external accounts. CareerOS keeps manual storage usable when private inference is unavailable.

## Configuration and operational boundaries
- Required for live AI: \`SELF_HOSTED_LLM_URL\`, \`SELF_HOSTED_LLM_TOKEN\` and a model server that actually runs weights.
- Optional: \`SELF_HOSTED_LLM_MODEL=qwen3:8b\`. HTTP only for loopback in non-production development.
- Required for verified database persistence: server-only \`SUPABASE_SERVICE_ROLE_KEY\`. This credential authorizes database operations; it is not a hosted AI key.
- The private inference gateway requires TLS, bearer authentication, disallows redirects and exposes only the native Ollama chat endpoint.
- Model calls timeout after 45 seconds, do not stream, limit input/output and request JSON-schema-constrained responses.
- These controls do not guarantee factual truth. A human remains the final authority for career claims.
- Provider-free inference does not automatically make the entire CareerOS stack independent of Vercel or Supabase.
- Actual model-server installation, GPU benchmarking, live example interviews, quality evaluation, and account data-protection audit are release gates. **Passing unit tests alone is not a running model.**
