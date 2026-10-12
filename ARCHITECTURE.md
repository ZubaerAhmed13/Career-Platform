# Architecture

Modular-monolith Next.js 15 App Router application. Server Components read verified account identity with Supabase SSR and issue user-bound queries; Server Actions validate data with Zod and use authenticated row-level policies. Browser creates sessions only through the Supabase Auth provider; the middleware refreshes auth cookies. React client components handle form pending/feedback and theme selection. Tailwind semantic CSS variables supply light/dark surfaces.

**Boundaries:** public landing and authentication routes; private app-group layout with server account guard; account/auth server actions; profile validation; database RLS; planned standalone career modules. Future AI access should enter through authenticated server-only integration, with budget checks and explicit user consent, not client API keys.

**Storage:** reserved private bucket and owner-only metadata; uploads purposely disabled until verified validation, scanning and signed access handling. Future career facts must be master data; tailored resume versions are derivatives; application records snapshot exact submitted versions; interview sessions reference application/version context.

**Tradeoffs:** no microservices, queue, fabricated AI integrations or premature domain tables. Modules will be introduced as migrations/features per milestone.

## Career Vault module architecture
`src/lib/career/schema.ts` provides typed record and evidence validation. Authenticated server actions under `src/app/actions/career*.ts` use authenticated `auth.getUser()` and PostgreSQL RLS rather than caller-provided ownership. The normalized owner-scoped tables and composite foreign keys live in migrations 003–004. Record revision checks reject stale edits, and triggers write owner-scoped audit events.

Career Vault pages under `src/app/(app)/career-vault` expose record forms, search, evidence/link editing, suggestion review, real AI interviews when configured, and a server-side owned JSON export endpoint. `src/lib/career/ai.ts` is the server-only provider boundary; `ai-validation.ts` rejects malformed or unsupported fact proposals. Next.js server actions never receive a privileged Supabase service key. Full CV parsing, scanning and file storage write access remain disabled.

The optional binary import boundary comprises `clamav.ts` (trusted internal antivirus verdict), `cv-format.ts` (extension/signature), `zip-security.ts` (DOCX archive bounds), and `cv-file.ts` (in-memory text extraction). Without a scanner the UI and action disable uploads. Per-user AI quota is claimed via SQL migration 006 before the external provider is contacted.
