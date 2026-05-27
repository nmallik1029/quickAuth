"use client";

import { useActionState } from "react";
import { createClientAppAction, type ClientAppState } from "@/app/actions/client-apps";

const inputCls =
  "w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none transition focus:border-zinc-400";

export function NewAppForm() {
  const [state, formAction, pending] = useActionState<ClientAppState, FormData>(createClientAppAction, {});
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-zinc-300">Name</label>
        <input name="name" required minLength={2} maxLength={80} className={inputCls} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-zinc-300">Slug</label>
        <input name="slug" required minLength={2} maxLength={50} pattern="[a-z0-9-]+" className={inputCls} />
        <p className="text-[11px] text-zinc-500">lowercase letters, numbers, hyphens</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-zinc-300">Description</label>
        <textarea name="description" maxLength={300} rows={2} className={`${inputCls} resize-none`} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-zinc-300">Homepage URL</label>
        <input name="homepageUrl" type="url" className={inputCls} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-zinc-300">Logo URL</label>
        <input name="logoUrl" type="url" className={inputCls} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-zinc-300">Redirect URIs</label>
        <textarea
          name="redirectUris"
          required
          rows={4}
          placeholder="http://localhost:3001/auth/callback&#10;https://vsn.example.com/auth/callback"
          className={`${inputCls} resize-none font-mono text-xs`}
        />
        <p className="text-[11px] text-zinc-500">One per line. http:// only for localhost.</p>
      </div>

      {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-200 disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create app"}
        </button>
      </div>
    </form>
  );
}
