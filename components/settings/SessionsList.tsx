"use client";

import { useTransition } from "react";
import {
  revokeSessionAction,
  revokeOtherSessionsAction,
  signOutEverywhereAction,
} from "@/app/actions/security";

type SessionRow = {
  id: string;
  createdAt: string;
  expiresAt: string;
  userAgent: string | null;
  ipAddress: string | null;
  isCurrent: boolean;
};

function fmt(d: string) {
  return new Date(d).toLocaleString();
}

function shortUA(ua: string | null) {
  if (!ua) return "Unknown device";
  // crude device detection
  if (/iPhone|Android|Mobile/i.test(ua)) return "Mobile browser";
  if (/Edg\//.test(ua)) return "Microsoft Edge";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Safari\//.test(ua)) return "Safari";
  return ua.slice(0, 60);
}

export function SessionsList({ sessions }: { sessions: SessionRow[] }) {
  const [isPending, startTransition] = useTransition();

  function revoke(id: string) {
    startTransition(async () => {
      await revokeSessionAction(id);
    });
  }
  function revokeOthers() {
    startTransition(async () => {
      await revokeOtherSessionsAction();
    });
  }
  function signOutAll() {
    startTransition(async () => {
      await signOutEverywhereAction();
    });
  }

  const hasOthers = sessions.some((s) => !s.isCurrent);

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold">Active sessions</h2>
          <p className="mt-1 text-xs text-zinc-400">Devices currently signed in to your account.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={revokeOthers}
            disabled={isPending || !hasOthers}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs hover:bg-zinc-900 disabled:opacity-50"
          >
            Revoke others
          </button>
          <button
            type="button"
            onClick={signOutAll}
            disabled={isPending}
            className="rounded-md border border-red-700/50 bg-red-950/30 px-3 py-1.5 text-xs text-red-200 hover:bg-red-900/40 disabled:opacity-50"
          >
            Sign out everywhere
          </button>
        </div>
      </div>

      <ul className="mt-4 divide-y divide-zinc-800">
        {sessions.length === 0 && (
          <li className="py-3 text-sm text-zinc-500">No active sessions.</li>
        )}
        {sessions.map((s) => (
          <li key={s.id} className="flex items-center justify-between py-3">
            <div className="text-sm">
              <p className="font-medium">
                {shortUA(s.userAgent)}{" "}
                {s.isCurrent && (
                  <span className="ml-1 rounded-full bg-green-900/40 px-2 py-0.5 text-[10px] uppercase tracking-wide text-green-300">
                    Current
                  </span>
                )}
              </p>
              <p className="text-xs text-zinc-500">
                {s.ipAddress ? `${s.ipAddress} · ` : ""}Started {fmt(s.createdAt)} · Expires {fmt(s.expiresAt)}
              </p>
            </div>
            {!s.isCurrent && (
              <button
                type="button"
                onClick={() => revoke(s.id)}
                disabled={isPending}
                className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs hover:bg-zinc-900 disabled:opacity-50"
              >
                Revoke
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
