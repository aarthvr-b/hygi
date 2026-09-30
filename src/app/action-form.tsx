"use client";

import { useActionState, type ReactNode } from "react";
import type { ActionResult } from "./action-result";

type Props = {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  submitLabel: string;
  children?: ReactNode;
  className?: string;
};

export function ActionForm({ action, submitLabel, children, className }: Props) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className={className ?? "flex flex-col gap-3"}>
      {children}
      {state && <p role="alert">{state.error}</p>}
      <button type="submit" disabled={pending}>
        {submitLabel}
      </button>
    </form>
  );
}
