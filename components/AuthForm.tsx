"use client";

import { useActionState } from "react";
import type { AuthState } from "@/app/actions/auth";

type Action = (state: AuthState, formData: FormData) => Promise<AuthState>;

export function AuthForm({
  action,
  submitLabel,
  showUsername = false,
  mode = "signup",
}: {
  action: Action;
  submitLabel: string;
  showUsername?: boolean;
  mode?: "signup" | "login";
}) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, {});
  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        {mode === "login" ? "Email or username" : "Email"}
        <input
          name={mode === "login" ? "identifier" : "email"}
          type={mode === "login" ? "text" : "email"}
          required
          autoComplete={mode === "login" ? "username" : "email"}
          className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-400"
        />
      </label>
      {showUsername ? (
        <label className="flex flex-col gap-1 text-sm">
          Username
          <input
            name="username"
            type="text"
            required
            minLength={3}
            maxLength={32}
            autoComplete="username"
            className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-400"
          />
        </label>
      ) : null}
      <label className="flex flex-col gap-1 text-sm">
        Password
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={submitLabel.toLowerCase().includes("sign up") ? "new-password" : "current-password"}
          className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-400"
        />
      </label>
      {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
      >
        {pending ? "..." : submitLabel}
      </button>
    </form>
  );
}
