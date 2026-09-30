# Tech stack: Next.js + Supabase (Postgres, Auth, RLS), EU-region hosting

Needed: a TypeScript stack producing an installable PWA, relational data (studios/templates/shifts/prices/payments), multi-tenant isolation (ADR-0003), and GDPR-sane EU hosting for personal (non-clinical) data. We chose Next.js (App Router) for the app, Supabase (Postgres + Auth + Row-Level Security) in the Frankfurt region for data and auth, deployed on Vercel with functions pinned to `fra1`.

## Considered Options

- **Next.js + Supabase (EU) + Vercel** (chosen): mature, low ops overhead for a solo/duo build; Supabase RLS gives DB-enforced tenant isolation for free; Vercel is fastest to iterate on. Vercel is a US company, so EU personal data processed there rests on a DPA/SCC basis rather than full EU-native infrastructure — common practice, but a deliberate trade-off, not an oversight.
- **Next.js + Supabase (EU) + self-hosted Docker on a Hetzner VPS**: fully EU-native, no US-vendor data question at all, but meaningfully more ops work (deploys, TLS, backups) for no functional gain at this stage.

## Consequences

Nothing here blocks self-hosting later — the app is a standard Dockerizable Next.js app and Supabase's Postgres can be exported/migrated if a fully EU-native setup becomes a hard requirement.
