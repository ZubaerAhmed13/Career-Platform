# CareerOS AI — Step 2 live deployment status (13 October 2026)

## Verified connected backend
- **Supabase project:** CareerOS AI, ref `jtitfwzpfbyfsdpxxrbj` (eu-north-1).
- **Connection:** authorized management connector successfully accessed this project.
- **Migrations applied:** 15 additive migrations, from the initial account migration through `composite_fk_indexes`; all returned success.
- **Live schema:** 11 public tables, all with RLS enabled; zero registered users and zero stored career records at deployment time.
- **Private storage:** `career-private` bucket is configured nonpublic; browser upload policy remains disabled.
- **Security hardening:** anonymous Data API table grants revoked; authenticated users limited to required operations. Direct calls to two internal definer trigger functions revoked; provider-only AI RPC execution restricted to service role.
- **Performance:** six composite foreign-key indexes installed; no unindexed-FK advisor findings after deployment.
- **Actual app deployment:** NOT confirmed. No Vercel/hosting configuration or server-side model/antivirus secrets were accessed.

## Step 2 acceptance matrix

| Capability | Implementation | Live verification |
|---|---|---|
| Account schema/profile initialization | Deployed | Database schema verified; user sign-up not tested |
| Career Vault storage (eight types) | Deployed | 11 RLS-protected tables verified; signed-in CRUD not tested |
| CRUD and structured fact review | Application source, functions deployed | Unit, local SQL tests; real-user E2E pending |
| Career evidence/knowledge relationships | Composite FKs/indexes deployed | Schema verified; two-user hosted tests pending |
| Duplicate guard/field-selective merges | RPCs deployed | SQL integration on disposable Postgres; hosted-user flow pending |
| Profile JSON export | Application source | Needs deployed app and signed-in account |
| AI Career Interviewer/extraction | Conditional source and SQL RPCs | OpenAI server secret and live model testing pending |
| PDF/DOCX scanned import | Conditional source | ClamAV/private parser runtime absent; disabled |
| Responsive browser smoke tests | Implemented | 8 public/anonymous cases passed in GitHub CI |
| Private authenticated browser checks | Written staging plan | No real users yet; pending |
| GDPR/privacy operational readiness | Incomplete | Retention/deletion/provider assessments pending |

**Do not advertise Step 2 as production-ready until real authenticated flows, AI-provider runtime, scanner and deployment are validated.**

Supabase migration history versions are assigned by the management connector on execution (`2026101306...`), and differ from the GitHub migration filename prefixes (`20261012...` and `20261013...`). Before enabling automated Supabase CLI migrations, reconcile version tracking to prevent accidental reapplication of already installed DDL.
