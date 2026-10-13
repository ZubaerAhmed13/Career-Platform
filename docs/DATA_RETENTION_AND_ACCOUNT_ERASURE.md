# CareerOS account data, export, deletion and retention runbook

**Status:** source-level implementation and CI checks only. Live signed-in account deletion, complete legal review and any backup-expiry assertions remain **unverified**. Never use a real applicant or production account for destructive tests.

## 1. Separate data controls

- `/career-vault/privacy` exports only the Career Vault and offers a confirmation-gated `clear_my_career_vault()` RPC. Authentication and the main profile remain intact.
- `/settings` offers a broader `/api/account/export` JSON archive containing authenticated user ID/email/creation time, profile, file metadata, career records, evidence, links, suggestions, interview sessions/messages and career activity.
- This is **not a complete GDPR subject-access response**. Auth identity and session system tables, internal AI quota bookkeeping, logs, third-party subprocessors and retained backups are excluded from the downloadable JSON. Operators must handle a verified broader request separately.

## 2. Self-service account deletion (no user is deleted on deployment)

The settings UI reveals permanent deletion controls only after the user opens them. The server action `src/app/actions/delete-account.ts`:

1. Requires exact typed phrase `DELETE MY ACCOUNT`, a separate consent checkbox and a non-empty current password.
2. Verifies the current authenticated identity via `getUser()` and reauthenticates password using an isolated **publishable-key** Supabase client; the returned subject ID must match the existing user.
3. Requires a server-only `SUPABASE_SERVICE_ROLE_KEY`; never expose or transmit this value to client JavaScript, build output, telemetry, tests or support tickets.
4. Refuses deletion if the protected `career-private/<user-id>` folder contains existing objects, or storage inspection is unavailable. The operator must verify/remove stored objects using the Storage API, never by directly deleting storage database rows. Do not circumvent this safeguard.
5. Calls `auth.admin.deleteUser(user.id, false)` (hard deletion) **only** with the server-verified subject. Auth-level deletion cascades to referencing public records, without first clearing/partially modifying user data.
6. Signs the browser out and redirects after the admin deletion call succeeds. A failed admin deletion returns an error without claiming completion.

This password-based flow is **not a working deletion solution for federated/SSO-only accounts**; they require a verified support process. The current app supports email/password accounts.

## 3. Hosted schema verification (read-only, 13 October 2026)

On primary Supabase project `jtitfwzpfbyfsdpxxrbj`, all 11 public tables directly referencing `auth.users` were observed to use `ON DELETE CASCADE`. `career_ai_usage` has RLS enabled without browser policies intentionally, as usage is handled by service-only functions. This schema check **does not test live user deletion or Supabase's Auth service**.

Never disable RLS, expose the service role key, or run staging deletion tests against this primary project.

## 4. Retention, backups and requests

A hard deletion removes live account-associated database rows, not provider backups, historic logs, CDN caches or copies an applicant exported elsewhere. A previously issued JWT may remain usable until expiry; the user cannot mint new tokens after auth/session deletion. Before publishing, the operator must set and publish:

- Identity and contact information for the data controller/operator, privacy contact, and verified GDPR request process.
- Purpose, lawful basis, subprocessors, hosting geography, international transfers and contractual commitments.
- Exact provider **backup expiration** policy, deletion queue processing target, operational log lifetime, incident logging and access restrictions. Confirm these with the relevant providers; no retention duration is asserted here.
- Password/session timeout and any additional session revocation/short JWT protections.
- Export scope, rectification/access methods, consent withdrawal, and response deadlines per relevant law.
- Safeguards and operator workflow for Storage objects that prevent Auth user deletion.
- Additional secure deletion for any future file buckets, message queues or external AI logs before claiming full erasure.

## 5. Staging acceptance (not yet executed)

Use a separate, disposable Supabase project and approved identities. Test that an owner can export their own full account archive while the second owner cannot see its contents; a wrong password/phrase never deletes; a test account with no storage objects is removed and cannot log in again; associated tables have no remaining user rows; and a second unrelated test user remains unchanged.

**Use newly created throwaway accounts only**, separate from the two authenticated Vault integration identities. Supply reviewed server secrets through a protected staging environment. Never run account deletion acceptance through the normal PR/push workflow or against production.

## 6. Rollout gates

- `SUPABASE_SERVICE_ROLE_KEY` present in a tightly scoped server-only Vercel environment for the tested branch (no client exposure).
- Auth/email provider behavior, failure modes and Storage edge cases manually verified in staging.
- A documented privacy controller and full retention/backup schedule approved.
- Logged-in keyboard/mobile/screen reader acceptance and production authorization review signed off.
- No automatic merge or promotion without these approvals.

Further references: [Supabase user management](https://supabase.com/docs/guides/auth/managing-user-data), [storage deletion](https://supabase.com/docs/guides/storage/management/delete-objects).

## Additional staging controls (October 13)

An optional protected GitHub `staging` workflow gate now includes opt-in destructive acceptance against throwaway users (one Vault-only erasure and one full Auth hard deletion). It is disabled by default. Set `CAREER_STAGING_ERASURE=I_UNDERSTAND_DELETES_DISPOSABLE_USERS` only after verifying a dedicated *non-production* Supabase project, an approved staging-only service-role key and two extra empty test users. Public CI must never execute these scenarios. See `docs/STAGING_SECURITY_RUNBOOK.md`.

The primary-project read-only security scan confirms RLS on all 11 public tables. Advisor warnings include nine authenticated SECURITY DEFINER RPCs requiring individual authorization audits and disabled leaked-password checks; these are not equivalent to a clean security acceptance. Backup expiry, support contact, controller and processor policies cannot be inferred from code and still require operator approval.
