"use client";

import { useActionState } from "react";
import { signIn, signUp, type LoginActionResult } from "./actions";

export function LoginForm() {
  const [signInState, signInAction, signInPending] = useActionState<
    LoginActionResult | null,
    FormData
  >(signIn, null);
  const [signUpState, signUpAction, signUpPending] = useActionState<
    LoginActionResult | null,
    FormData
  >(signUp, null);

  const state = signUpState ?? signInState;

  return (
    <form className="flex flex-col gap-3 w-full max-w-sm">
      <label className="flex flex-col gap-1">
        <span>Email</span>
        <input name="email" type="email" required autoComplete="email" />
      </label>
      <label className="flex flex-col gap-1">
        <span>Password</span>
        <input
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="current-password"
        />
      </label>

      {state && "error" in state && <p role="alert">{state.error}</p>}
      {state && "info" in state && <p role="status">{state.info}</p>}

      <div className="flex gap-2">
        <button formAction={signInAction} disabled={signInPending || signUpPending}>
          Log in
        </button>
        <button formAction={signUpAction} disabled={signInPending || signUpPending}>
          Sign up
        </button>
      </div>
    </form>
  );
}
