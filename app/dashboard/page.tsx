import { requireUser } from "@/lib/auth/require-user";
import { logoutAction, resendVerificationAction } from "@/app/actions/auth";
import { ResendButton } from "@/components/MessageForm";

export default async function DashboardPage() {
  const user = await requireUser();
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-12">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <form action={logoutAction}>
          <button className="rounded border border-zinc-700 px-3 py-1.5 text-sm">Log out</button>
        </form>
      </header>
      <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4 text-sm">
        <p className="text-zinc-400">Signed in as</p>
        <p className="font-medium">{user.email}</p>
        <p className="mt-2 text-xs text-zinc-500">
          Role: {user.role} · Verified: {user.emailVerifiedAt ? "yes" : "no"}
        </p>
      </section>
      {!user.emailVerifiedAt && (
        <section className="rounded border border-yellow-700/40 bg-yellow-900/10 p-4 text-sm">
          <p className="mb-2">Your email is not verified yet.</p>
          <ResendButton action={resendVerificationAction} />
        </section>
      )}
    </main>
  );
}
