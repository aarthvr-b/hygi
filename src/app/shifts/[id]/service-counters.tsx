"use client";

import { useState } from "react";
import { formatCents } from "@/lib/onboarding/money";

export type CounterRow = {
  serviceId: string;
  serviceName: string;
  unitPriceCents: number;
  count: number;
};

// One +/- counter per Service, posted as "count:<service id>" fields.
export function ServiceCounters({ rows }: { rows: CounterRow[] }) {
  const [counts, setCounts] = useState(() => rows.map((row) => row.count));

  const step = (index: number, by: number) =>
    setCounts(counts.map((count, i) => (i === index ? Math.max(0, count + by) : count)));

  const totalCents = rows.reduce((total, row, i) => total + counts[i] * row.unitPriceCents, 0);

  return (
    <>
      <ul className="flex flex-col gap-3">
        {rows.map((row, i) => (
          <li key={row.serviceId} className="flex items-center gap-3">
            <span className="flex flex-1 flex-col">
              <span>{row.serviceName}</span>
              <span className="text-sm">€ {formatCents(row.unitPriceCents)}</span>
            </span>
            <button
              type="button"
              className="h-11 w-11 rounded border text-xl"
              aria-label={`One less ${row.serviceName}`}
              disabled={counts[i] === 0}
              onClick={() => step(i, -1)}
            >
              −
            </button>
            <output className="w-8 text-center text-xl tabular-nums" aria-label={`${row.serviceName} count`}>
              {counts[i]}
            </output>
            <button
              type="button"
              className="h-11 w-11 rounded border text-xl"
              aria-label={`One more ${row.serviceName}`}
              onClick={() => step(i, 1)}
            >
              +
            </button>
            <input type="hidden" name={`count:${row.serviceId}`} value={counts[i]} />
          </li>
        ))}
      </ul>
      <p className="font-semibold">Earnings: € {formatCents(totalCents)}</p>
    </>
  );
}
