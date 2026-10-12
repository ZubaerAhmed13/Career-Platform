# Architecture

Modular-monolith Next.js 15 App Router application. Server Components read verified account identity with Supabase SSR and issue user-bound queries; Server Actions validate data with Zod and use authenticated row-level policies. Browser creates sessions only through the Supabase Auth provider; the middleware refreshes auth cookies. React client components handle form pending/feedback and theme selection. Tailwind semantic CSS variables supply light/dark surfaces.

**Boundaries:** public landing and authentication routes; private app-group layout with server account guard; account/auth server actions; profile validation; database RLS; planned standalone career modules. Future AI access should enter through authenticated server-only integration, with budget checks and explicit user consent, not client API keys.

**Storage:** reserved private bucket and owner-only metadata; uploads purposely disabled until verified validation, scanning and signed access handling. Future career facts must be master data; tailored resume versions are derivatives; application records snapshot exact submitted versions; interview sessions reference application/version context.

**Tradeoffs:** no microservices, queue, fabricated AI integrations or premature domain tables. Modules will be introduced as migrations/features per milestone.
