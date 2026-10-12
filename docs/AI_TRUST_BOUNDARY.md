# CareerOS AI source integrity and authorization

**Goal:** Users cannot impersonate the AI provider or directly insert a provider-authored suggestion using a browser Supabase publishable key.

## Two different trust levels
1. A signed-in end user can add, edit, approve and delete their own career information through normal, RLS-protected endpoints. They can insert `role='user'` interview messages and stage `origin='cv_import'` pasted text. None is represented as provider-generated.
2. The verified server AI service authenticates the user first, calls the real model with consented bounded context, validates typed output and source quotes, then invokes a service-role-only SQL RPC scoped to that specific authenticated account. An atomic transaction stores AI output and proposals; invalid ownership or quotes reject all writes.

The server-only `SUPABASE_SERVICE_ROLE_KEY` grants broad privileged database capabilities. Keep it restricted to backend environment configuration. Do not send this secret in chat messages, client bundles, GitHub commits, browser configuration or console logs. The web app is designed to **disable** AI features if the key or model provider is absent.

## New migration order
Run additive migrations 001–008 only after confirming the target project, migration history and backup. Migration 007 narrows insert policies; migration 008 applies the same pattern to CV extraction and a new-write HTTP(S) URL constraint. Review effects on existing clients before deployment.

## Required live staging checks
Use two disposable users with `npm run test:integration` to confirm unauthenticated/cross-owner reads fail, spoofed provider messages and RPC calls fail, approval is owner-scoped and confirmed records are not silently replaced. Separately test successful provider writes with a protected server key and invalid structured output to ensure DB transaction rollback. CI unit tests cannot establish a valid SQL deployment or live data isolation.

## Known limitations
The app does not yet have a configured trusted AI provider, project migration validation, security-monitored runtime, hardened parser worker, or production abuse-defense program. Raw CV uploads remain disabled without internal ClamAV. The privileged database key must be rotated/managed by the operator, and integration must be audited before public launch.
