"use client";

import { useActionState } from "react";
import type { MessageState } from "@/app/actions/auth";

type Action = (state: MessageState, formData: FormData) => Promise<MessageState>;

export function MessageForm({
  action,
  submitLabel,
  fields,
  hidden,
}: {
  action: Action;
  submitLabel: string;
  fields: { name: string; label: string; type?: string; minLength?: number; autoComplete?: string }[];
  hidden?: Record<string, string>;
}) {
  const [state, formAction, pending] = useActionState<MessageState, FormData>(action, {});
  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-3">
      {hidden &&
        Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {fields.map((f) => (
        <label key={f.name} className="flex flex-col gap-1 text-sm">
          {f.label}
          <input
            name={f.name}
            type={f.type ?? "text"}
            required
            minLength={f.minLength}
            autoComplete={f.autoComplete}
            className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-400"
          />
        </label>
      ))}
      {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
      {state.message ? <p className="text-sm text-green-400">{state.message}</p> : null}
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

type FormActionFn = (state: MessageState, formData: FormData) => Promise<MessageState>;

export function ResendButton({ action }: { action: FormActionFn }) {
  const [state, formAction, pending] = useActionState<MessageState, FormData>(action, {});
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <button
        type="submit"
        disabled={pending}
        className="rounded border border-zinc-700 px-3 py-1.5 text-sm disabled:opacity-60"
      >
        {pending ? "..." : "Resend verification email"}
      </button>
      {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
      {state.message ? <p className="text-sm text-green-400">{state.message}</p> : null}
    </form>
  );
}
