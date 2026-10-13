# AI Career Interviewer

**Provider:** OpenAI Responses API (server-only), optional in Milestone 2. Set `OPENAI_API_KEY` in an encrypted server environment; optional `CAREER_AI_MODEL` defaults to `gpt-4o-mini`. No credentials are committed. The UI displays an unavailable state if the provider is absent.

**Flow:** user creates a session → answers a question with explicit consent → authenticated server saves their answer → bounded, relevant confirmed career context and recent messages are sent to the provider → structured response is parsed and validated → only suggestions quoting the user's latest answer verbatim are saved pending review → the user approves/rejects each suggestion. Approvals are atomic and do not overwrite existing confirmed records.

**Safeguards:** 2,000-character answer limit, 20-second provider timeout, six stored messages per minute (coarse rate-limit; hardening still required), 10-message context, eight confirmed career records at most, 600 max output tokens, a strict JSON output schema, Zod runtime validation and quote matching. `store:false` is requested from the provider. On timeout/rejection the user answer is retained but no invented assistant reply is stored. Do not treat a missing provider as a simulated AI.

**Known limitations:** staging API key/test budget not supplied, so live provider calls cannot be claimed tested. Concurrency-aware rate limiting, granular deletion/retention policies, DPIA/transfer review, user opt-in privacy notice, monitoring and abuse prevention remain to be validated before public release. No unchecked AI suggestion becomes a confirmed career record.

## Pasted CV AI extraction
A specialized text extraction prompt uses the same provider boundary and strict structured JSON output. User consent is required; the server rejects unsupported quotes, validates the extracted facts against category/length rules, limits input to 4,000 characters and at most six proposals, and writes them only to the pending suggestion queue. Missing provider access leaves manual intake operational. This is **not** automatic PDF/DOCX file parsing. Live model behavior has not been verified with an API credential.

## Integrity boundary — server privileged persistence
Trusted assistant messages and provider-generated suggestions are now committed together via the `persist_verified_ai_interview` PostgreSQL function. It checks a real active session owned by the authenticated account, that the most recent answer belongs to the same user, and that each proposal cites a verbatim substring of that answer. An authenticated browser can save only its own `user` messages. The server-only service-role key is required; without both model and secure persistence credentials, the interface reports AI unavailable. A second service-role-only SQL function persists evidence-matching suggestions from consented pasted-CV extraction. This design prevents a browser from fabricating provider-labeled content by writing directly to PostgREST. Production SQL staging tests are still outstanding.

## Topic-based context ranking
`src/lib/career/context.ts` ranks a bounded set of confirmed records by interview topic. For example, a project interview prioritizes saved projects, education and skills; an experience interview prioritizes confirmed employment records. It never creates or substitutes career facts. Final provider and session testing remains outstanding.

## Dedicated career-only AI (October 2026)
The AI has exactly two permitted request operations at the server provider boundary:
`career_interview` and `career_cv_paste`. Unsupported purposes are rejected at runtime. There is **no general-purpose assistant route**. The interview covers the eight permanent Career Vault categories: experience, achievements, projects, skills, education, languages, certifications and volunteering.

The interview structured response includes `scope = career | off_topic`. When a user asks for unrelated advice, programming, entertainment or broader chat, CareerOS replaces the provider's reply with a fixed career-only reminder and saves **zero** suggestions. When answering career questions, the model asks one focused follow-up, and any generated fact still needs a verbatim excerpt from the user's latest answer and human approval.

**Trust boundary improvement:** Applicant-controlled career records are sent as bounded *reference data in a user message*, not appended to privileged model instructions. Past conversation and CV content are explicitly untrusted data; embedded commands cannot authorize new tools or overwrite confirmed facts. The CV extractor has a separate, narrow evidence-extraction prompt that refuses fabricated details.

This makes the **coded assistant behavior purpose-specific**, not a separately fine-tuned proprietary model, and not proof of live provider behavior. Real model execution still requires protected `OPENAI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` configuration, provider budget/consent, and staging acceptance.
