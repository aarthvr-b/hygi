# Multi-tenant-ready data model, single-tenant-feeling MVP

Other hygienists are on the roadmap beyond the first user, but the MVP is being built for exactly one real user (used for a one-month pilot). We chose to scope every table by `hygienist_id` (enforced via Postgres Row-Level Security, per ADR-0004) from day one, while deliberately not building any self-serve signup, plan/billing, or admin UI for the MVP.

## Considered Options

- **Single-tenant schema, retrofit later** (rejected): faster to start, but retrofitting tenant scoping onto a live schema with real data is expensive and risky, and tends to get delayed indefinitely once other work takes priority.
- **Multi-tenant schema, single-tenant product surface** (chosen): tenant isolation is cheap to add now and enforced at the DB layer, while the actual MVP surface (onboarding, auth, UI) stays as simple as a single-account app.

## Consequences

Every query and RLS policy must be written as if multiple hygienists already exist, even though only one does. There is no signup flow yet — new accounts are created manually — so "supporting other hygienists" still requires real product work later; this ADR only removes the data-model rework from that future scope.
