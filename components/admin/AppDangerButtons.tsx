"use client";

import { useTransition } from "react";
import {
  regenerateClientSecretAction,
  setClientAppActiveAction,
} from "@/app/actions/client-apps";

export function AppDangerButtons({ appId, isActive }: { appId: string; isActive: boolean }) {
  const [pending, start] = useTransition();

  function toggleActive() {
    start(async () => {
      await setClientAppActiveAction(appId, !isActive);
    });
  }

  function regenerate() {
    if (!confirm("Regenerate client secret? This immediately invalidates the old one and signs out all access tokens issued to this app.")) return;
    start(async () => {
      await regenerateClientSecretAction(appId);
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        disabled={pending}
        onClick={toggleActive}
        className={`rounded-md border px-3 py-1.5 text-xs disabled:opacity-50 ${
          isActive
            ? "border-red-700/50 bg-red-950/30 text-red-200 hover:bg-red-900/40"
            : "border-green-700/50 bg-green-950/30 text-green-200 hover:bg-green-900/40"
        }`}
      >
        {isActive ? "Deactivate" : "Activate"}
      </button>
      <button
        disabled={pending}
        onClick={regenerate}
        className="rounded-md border border-yellow-700/50 bg-yellow-950/30 px-3 py-1.5 text-xs text-yellow-200 hover:bg-yellow-900/40 disabled:opacity-50"
      >
        Regenerate secret
      </button>
    </div>
  );
}
