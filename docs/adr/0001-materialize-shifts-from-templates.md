# Materialize Shifts from Templates into a rolling window

Shift Templates (recurring weekday + interval + anchor patterns) could either generate real Shift rows ahead of time, or be computed virtually at render time with a separate exceptions table (the iCal RRULE+EXDATE model). We chose materialization: a job generates real, independent Shift rows for a rolling window (e.g. next 8-12 weeks), each keeping the source Template only as provenance.

## Considered Options

- **Virtual shifts + exceptions table**: closer to calendar-app conventions, no generation job needed, but Shifts can't hold real data (service counts, snapshotted prices) until materialized anyway, and edits/skips need a second exceptions concept.
- **Materialize into real rows** (chosen): a Shift is a real row the moment it exists, so editing it *is* the exception mechanism — no separate exceptions table. Requires a periodic job to keep the rolling window topped up.

## Consequences

Deleting or editing a generated Shift never touches its Template or other Shifts — each Shift is fully independent after creation. If the generation job stops running, future shifts silently stop appearing past the current window; this needs monitoring, not just a cron entry.
