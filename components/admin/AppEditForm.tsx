"use client";

import { useActionState } from "react";
import { updateClientAppAction, type ClientAppState } from "@/app/actions/client-apps";

const inputCls =
  "w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none transition focus:border-zinc-400";

export function AppEditForm({
  id,
  initial,
}: {
  id: string;
  initial: { name: string; description: string; homepageUrl: string; logoUrl: string };
}) {
  const [state, formAction, pending] = useActionState<ClientAppState, FormData>(updateClientAppAction, {});
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-zinc-300">Name</label>
        <input name="name" defaultValue={initial.name} required minLength={2} maxLength={80} className={inputCls} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-zinc-300">Description</label>
        <textarea
          name="description"
          defaultValue={initial.description}
          maxLength={300}
          rows={2}
          className={`${inputCls} resize-none`}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-zinc-300">Homepage URL</label>
        <input name="homepageUrl" type="url" defaultValue={initial.homepageUrl} className={inputCls} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-zinc-300">Logo URL</label>
        <input name="logoUrl" type="url" defaultValue={initial.logoUrl} className={inputCls} />
      </div>
      {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
      {state.message ? <p className="text-sm text-green-400">{state.message}</p> : null}
      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-200 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
