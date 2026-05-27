"use client";

import { useActionState } from "react";
import { changePasswordAction, type SecurityState } from "@/app/actions/security";
import { PasswordInput } from "@/components/PasswordInput";

const inputCls =
  "w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none transition focus:border-zinc-400";

export function PasswordSection({ hasPassword }: { hasPassword: boolean }) {
  const [state, formAction, pending] = useActionState<SecurityState, FormData>(changePasswordAction, {});

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <h2 className="text-sm font-semibold">{hasPassword ? "Change password" : "Set a password"}</h2>
      <p className="mt-1 text-xs text-zinc-400">
        {hasPassword
          ? "Changing your password will sign you out of other sessions."
          : "Your account currently has no password. Set one to enable email/password login."}
      </p>

      <form action={formAction} className="mt-4 flex max-w-sm flex-col gap-3">
        {hasPassword ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="currentPassword" className="text-xs font-medium text-zinc-300">
              Current password
            </label>
            <PasswordInput
              id="currentPassword"
              name="currentPassword"
              autoComplete="current-password"
              required
            />
          </div>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="newPassword" className="text-xs font-medium text-zinc-300">
            New password
          </label>
          <PasswordInput
            id="newPassword"
            name="newPassword"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirmPassword" className="text-xs font-medium text-zinc-300">
            Confirm new password
          </label>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>

        {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
        {state.message ? <p className="text-sm text-green-400">{state.message}</p> : null}

        <div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:opacity-60"
          >
            {pending ? "Saving…" : hasPassword ? "Change password" : "Set password"}
          </button>
        </div>
      </form>
    </section>
  );
}

// Re-export so PasswordInput can be tree-shaken or replaced later
export { inputCls };
