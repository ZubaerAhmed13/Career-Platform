# Security model and launch blockers

Supabase Auth manages credentials and session tokens; @supabase/ssr manages cookies, and protected pages call auth.getUser() server-side. Server-side profile update uses verified user.id rather than user input; Postgres RLS independently enforces ownership. The database intentionally has no client document-upload policy. No privileged service-role key is required.

**Limitations requiring verification before launch:** live registration/password recovery email delivery, rate-limit/abuse protections, staging cross-account RLS and upload tests, full CSRF/origin review, CSP configuration, third-party dependency auditing, logging/monitoring, data export/deletion, GDPR notices, retention and DPA/legal review, German localization, scanning and private-download flow. Do not claim GDPR compliance on current implementation. Public NEXT_PUBLIC_ variables are not secrets, but server service-role credentials must never use that prefix.
