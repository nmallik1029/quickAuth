"use client";

import { useActionState } from "react";
import { updateProfileAction, type ProfileState } from "@/app/actions/profile";

const inputCls =
  "w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none transition focus:border-zinc-400";

export function ProfileForm({
  initial,
}: {
  initial: { displayName: string; username: string; bio: string };
}) {
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(updateProfileAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="displayName" className="text-xs font-medium text-zinc-300">Display name</label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          maxLength={80}
          defaultValue={initial.displayName}
          className={inputCls}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="username" className="text-xs font-medium text-zinc-300">Username</label>
        <input
          id="username"
          name="username"
          type="text"
          required
          minLength={3}
          maxLength={32}
          defaultValue={initial.username}
          className={inputCls}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="bio" className="text-xs font-medium text-zinc-300">Bio</label>
        <textarea
          id="bio"
          name="bio"
          maxLength={240}
          rows={3}
          defaultValue={initial.bio}
          className={`${inputCls} resize-none`}
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
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
