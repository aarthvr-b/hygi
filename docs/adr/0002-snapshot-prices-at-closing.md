# Snapshot prices onto Shift Lines at closing time, not live lookup

A closed Shift's earnings must reflect the price in force when the work was done, and prices change over time per studio/service. We chose to snapshot the price onto each Shift Line at the moment a Shift is closed, rather than always deriving earnings by looking up the Price List's validity history by date.

## Considered Options

- **Live lookup by date** (rejected): no duplication, but every earnings calculation becomes a join against historical validity ranges, and a bug or accidental edit to Price List history could silently rewrite past earnings.
- **Snapshot at closing** (chosen): a closed Shift's earnings are self-contained — simpler to query, and immune to later changes in the Price List.

## Consequences

Fixing a genuine price-entry mistake after the fact does not retroactively fix already-closed shifts; that requires editing the specific Shift's lines directly. This is accepted as correct behavior, not a bug — "closing" is a commitment, not a computed view.
