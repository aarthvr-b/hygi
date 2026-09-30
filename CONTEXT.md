# Hygi

Back-office app for a freelance dental hygienist working across multiple dental studios: schedule, work done, earnings, and tax set-asides. Single source of truth; no integration with studios' own systems.

## Language

**Studio**:
A dental practice the hygienist works at. Has no inherent "fixed" or "variable" type — recurrence is a property of its Shift Templates, not the studio itself. A studio with no templates is worked ad hoc via one-off Shifts.

**Shift Template**:
A recurring pattern that generates Shifts: weekday + time-of-day (AM / PM / full day) + interval in weeks (1 = every week, 2 = every other week, etc.) + an anchor date fixing the phase. Two templates on the same weekday with interval=2, anchored a week apart, produce an alternation between two studios (e.g. Thursday Milano/Treviglio on alternating weeks) without a separate "rotation" concept.
_Avoid_: Recurring shift, fixed studio, rotation.

**Shift**:
A single occurrence of work at one studio on one date (and time-of-day), either generated from a Shift Template or created as a one-off. Starts Planned, becomes Closed once what was actually done is recorded. Once generated, a Shift is independent of its Template (kept only as provenance) — editing or deleting a Shift is how a one-off exception (holiday, swapped studio, moved time) is expressed; it never touches the Template or other Shifts. Templates are regenerated into a rolling window of future Shifts rather than computed virtually. Closing a Shift writes its Shift Lines with prices snapshotted from the Price List at that moment — a Shift never re-derives its earnings from current prices.

**Service**:
A treatment type the hygienist performs (cleaning, whitening, periodontal cleaning, ...). Drawn from a catalog suggested at onboarding, editable per hygienist. Not studio-specific.

**Price List**:
Per studio, the price charged for each Service, with a validity date range (prices change over time; multiple entries can exist per studio/service, non-overlapping in time). Looked up by studio + service + date when a Shift is closed.

**Shift Line**:
One (Service, count, unit price) record on a Closed Shift. The unit price is a snapshot of the Price List at closing time, not a live reference — it does not change if the Price List is edited afterward.

**Earnings**:
The sum of Shift Line totals across a Studio's Closed Shifts. What is owed, derived entirely from work done — never adjusted by Payments.

**Payment**:
Money actually received from a Studio (amount + date received). Not allocated to specific Shifts — studios pay in lump sums (typically monthly) that don't correspond 1:1 to visits, so a Payment only affects the Studio's running balance, never a specific Shift.

**Studio Balance**:
Running total per Studio: sum(Earnings) − sum(Payments), starting from zero when the Studio is created in the app (no historical backfill). A balance that stays positive (owed) beyond a grace period is flagged as a likely underpayment — the flag is at the studio/balance level, not tied to identifying which visit was shorted.

**Tax Set-Aside Period**:
One calendar month. Aggregates every Payment *received* in that month, across all studios, into a single set-aside amount (sum of payments × the tax rate(s) in effect when each payment landed) and a single done/not-done flag for moving that total to savings. Not per Payment and not per Studio — she moves one lump sum a month. A Payment received late (e.g. in the following month, for work done earlier) belongs to the period it's received in, not the period the work was done in.
