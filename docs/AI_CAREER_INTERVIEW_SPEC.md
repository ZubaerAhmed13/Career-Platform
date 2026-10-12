# AI Career Interviewer

**Provider:** OpenAI Responses API (server-only), optional in Milestone 2. Set `OPENAI_API_KEY` in an encrypted server environment; optional `CAREER_AI_MODEL` defaults to `gpt-4o-mini`. No credentials are committed. The UI displays an unavailable state if the provider is absent.

**Flow:** user creates a session → answers a question with explicit consent → authenticated server saves their answer → bounded, relevant confirmed career context and recent messages are sent to the provider → structured response is parsed and validated → only suggestions quoting the user's latest answer verbatim are saved pending review → the user approves/rejects each suggestion. Approvals are atomic and do not overwrite existing confirmed records.

**Safeguards:** 2,000-character answer limit, 20-second provider timeout, six stored messages per minute (coarse rate-limit; hardening still required), 10-message context, eight confirmed career records at most, 600 max output tokens, a strict JSON output schema, Zod runtime validation and quote matching. `store:false` is requested from the provider. On timeout/rejection the user answer is retained but no invented assistant reply is stored. Do not treat a missing provider as a simulated AI.

**Known limitations:** staging API key/test budget not supplied, so live provider calls cannot be claimed tested. Concurrency-aware rate limiting, granular deletion/retention policies, DPIA/transfer review, user opt-in privacy notice, monitoring and abuse prevention remain to be validated before public release. No unchecked AI suggestion becomes a confirmed career record.

## Pasted CV AI extraction
A specialized text extraction prompt uses the same provider boundary and strict structured JSON output. User consent is required; the server rejects unsupported quotes, validates the extracted facts against category/length rules, limits input to 4,000 characters and at most six proposals, and writes them only to the pending suggestion queue. Missing provider access leaves manual intake operational. This is **not** automatic PDF/DOCX file parsing. Live model behavior has not been verified with an API credential.
