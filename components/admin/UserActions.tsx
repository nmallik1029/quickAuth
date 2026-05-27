"use client";

import { useTransition } from "react";
import {
  adminVerifyEmailAction,
  adminDisableUserAction,
  adminEnableUserAction,
  adminRevokeSessionsAction,
  adminSetRoleAction,
} from "@/app/actions/admin";

const btn = "rounded-md border px-3 py-1.5 text-xs transition disabled:opacity-50";

export function UserActions({
  userId,
  isSelf,
  isDisabled,
  isVerified,
  role,
}: {
  userId: string;
  isSelf: boolean;
  isDisabled: boolean;
  isVerified: boolean;
  role: "admin" | "user";
}) {
  const [pending, start] = useTransition();

  function run(fn: () => Promise<unknown>) {
    start(async () => {
      await fn();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {!isVerified && (
        <button
          disabled={pending}
          onClick={() => run(() => adminVerifyEmailAction(userId))}
          className={`${btn} border-zinc-700 hover:bg-zinc-900`}
        >
          Verify email
        </button>
      )}

      {isDisabled ? (
        <button
          disabled={pending}
          onClick={() => run(() => adminEnableUserAction(userId))}
          className={`${btn} border-green-700/50 bg-green-950/30 text-green-200 hover:bg-green-900/40`}
        >
          Enable user
        </button>
      ) : (
        <button
          disabled={pending || isSelf}
          onClick={() => run(() => adminDisableUserAction(userId))}
          className={`${btn} border-red-700/50 bg-red-950/30 text-red-200 hover:bg-red-900/40`}
        >
          Disable user
        </button>
      )}

      <button
        disabled={pending}
        onClick={() => run(() => adminRevokeSessionsAction(userId))}
        className={`${btn} border-zinc-700 hover:bg-zinc-900`}
      >
        Revoke all sessions
      </button>

      {role === "admin" ? (
        <button
          disabled={pending || isSelf}
          onClick={() => run(() => adminSetRoleAction(userId, "user"))}
          className={`${btn} border-zinc-700 hover:bg-zinc-900`}
          title={isSelf ? "Cannot demote yourself" : undefined}
        >
          Demote to user
        </button>
      ) : (
        <button
          disabled={pending}
          onClick={() => run(() => adminSetRoleAction(userId, "admin"))}
          className={`${btn} border-violet-700/50 bg-violet-950/30 text-violet-200 hover:bg-violet-900/40`}
        >
          Promote to admin
        </button>
      )}
    </div>
  );
}
