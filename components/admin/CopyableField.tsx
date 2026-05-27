"use client";

import { useState } from "react";

export function CopyableField({ value, mask = false }: { value: string; mask?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 break-all rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 font-mono text-xs text-zinc-200">
        {mask ? "•".repeat(Math.min(value.length, 40)) : value}
      </code>
      <button
        onClick={copy}
        className="rounded-md border border-zinc-700 px-2 py-1 text-xs hover:bg-zinc-900"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
