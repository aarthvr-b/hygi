"use client";

import { useState } from "react";
import { ActionForm } from "@/app/action-form";
import { acceptCatalog } from "./actions";

export function CatalogForm({ suggested }: { suggested: readonly string[] }) {
  const [rows, setRows] = useState(() => suggested.map((name, key) => ({ key, name })));
  const [nextKey, setNextKey] = useState(suggested.length);

  return (
    <ActionForm action={acceptCatalog} submitLabel="Save my Services">
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <li key={row.key} className="flex gap-2">
            <input name="service" defaultValue={row.name} aria-label="Service name" />
            <button
              type="button"
              onClick={() => setRows(rows.filter((r) => r.key !== row.key))}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => {
          setRows([...rows, { key: nextKey, name: "" }]);
          setNextKey(nextKey + 1);
        }}
      >
        Add a Service
      </button>
    </ActionForm>
  );
}
