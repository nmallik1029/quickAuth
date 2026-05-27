"use client";

import { useState, useTransition } from "react";
import { addRedirectUriAction, removeRedirectUriAction } from "@/app/actions/client-apps";

type Row = { id: string; uri: string };

export function RedirectUrisPanel({ appId, items }: { appId: string; items: Row[] }) {
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState<string | null>(null);

  function add() {
    setErr(null);
    if (!draft.trim()) return;
    const value = draft;
    start(async () => {
      const res = await addRedirectUriAction(appId, value);
      if (!res.ok) {
        setErr(res.error ?? "Failed to add.");
        return;
      }
      setDraft("");
    });
  }

  function remove(id: string) {
    start(async () => {
      await removeRedirectUriAction(id);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="divide-y divide-zinc-800 rounded-md border border-zinc-800">
        {items.length === 0 && (
          <li className="px-3 py-3 text-sm text-zinc-500">No redirect URIs.</li>
        )}
        {items.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-2 px-3 py-2">
            <span className="break-all font-mono text-xs text-zinc-200">{r.uri}</span>
            <button
              onClick={() => remove(r.id)}
              disabled={pending}
              className="rounded-md border border-zinc-700 px-2 py-1 text-xs hover:bg-zinc-900 disabled:opacity-50"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="https://example.com/auth/callback"
          className="flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs outline-none focus:border-zinc-400"
        />
        <button
          onClick={add}
          disabled={pending || !draft.trim()}
          className="rounded-md border border-zinc-700 px-3 py-2 text-xs hover:bg-zinc-900 disabled:opacity-50"
        >
          Add
        </button>
      </div>
      {err && <p className="text-xs text-red-400">{err}</p>}
    </div>
  );
}
