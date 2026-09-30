# In-app pending-actions surface as primary, Web Push as non-load-bearing addition

iOS Web Push only works for PWAs added to the Home Screen (never in a Safari tab), has no local scheduled-notification API (reminders must be server-sent via cron), and a subscription can silently expire with no in-app signal. We chose a two-layer design: Layer 1 is a persistent in-app "Da fare" list (unclosed shifts, un-set-aside tax periods, overdue studio balances) plus a Home Screen badge count, requiring no permissions and unable to silently break; Layer 2 is Web Push reminders (daily close-shift nudge, monthly tax reminder) that deep-link into Layer 1.

## Considered Options

- **Push as the primary reminder mechanism** (rejected): natural first instinct, but a silently-expired push subscription — common on iOS — would mean reminders quietly stop with nothing telling her or the app that they did.
- **In-app list as source of truth, push as strictly additive** (chosen): the product works correctly with push fully disabled; push only ever shortens the time before she notices something in Layer 1.

## Consequences

A future native iOS app should add full background/local push (not possible for a web PWA on iOS today) — this is a known gap this ADR deliberately leaves open rather than works around.
