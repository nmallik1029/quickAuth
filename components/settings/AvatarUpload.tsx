"use client";

import { useActionState, useRef, useState } from "react";
import { uploadAvatarAction, type ProfileState } from "@/app/actions/profile";

export function AvatarUpload({
  currentUrl,
  fallback,
}: {
  currentUrl: string | null;
  fallback: string;
}) {
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(uploadAvatarAction, {});
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) {
      setPreview(null);
      return;
    }
    setPreview(URL.createObjectURL(f));
  }

  const shown = preview ?? currentUrl;

  return (
    <form action={formAction} className="flex items-center gap-4">
      {shown ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={shown} alt="Avatar" className="h-16 w-16 rounded-full object-cover" />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800 text-lg font-semibold text-zinc-200">
          {fallback}
        </div>
      )}
      <div className="flex flex-1 flex-col gap-1.5">
        <input
          ref={inputRef}
          name="avatar"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={onPick}
          className="text-xs file:mr-3 file:rounded-md file:border-0 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-zinc-100 hover:file:bg-zinc-700"
        />
        <p className="text-[11px] text-zinc-500">PNG, JPG, or WEBP. Max 5MB.</p>
        {state.error ? <p className="text-xs text-red-400">{state.error}</p> : null}
        {state.message ? <p className="text-xs text-green-400">{state.message}</p> : null}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-black transition hover:bg-zinc-200 disabled:opacity-60"
      >
        {pending ? "Uploading…" : "Upload"}
      </button>
    </form>
  );
}
