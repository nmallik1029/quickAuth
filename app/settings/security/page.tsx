import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/current-user";
import { PasswordSection } from "@/components/settings/PasswordSection";
import { SessionsList } from "@/components/settings/SessionsList";

export default async function SecuritySettingsPage() {
  const current = await getCurrentSession();
  if (!current) redirect("/login");
  const user = current.user;

  const sessions = await prisma.session.findMany({
    where: { userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  const rows = sessions.map((s) => ({
    id: s.id,
    createdAt: s.createdAt.toISOString(),
    expiresAt: s.expiresAt.toISOString(),
    userAgent: s.userAgent,
    ipAddress: s.ipAddress,
    isCurrent: s.id === current.id,
  }));

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Security</h1>
        <p className="mt-1 text-sm text-zinc-400">Manage how you sign in and where you&apos;re signed in.</p>
      </header>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm">
        <h2 className="text-sm font-semibold">Account</h2>
        <dl className="mt-3 grid grid-cols-[140px_1fr] gap-y-1.5 text-xs">
          <dt className="text-zinc-500">Email</dt>
          <dd className="text-zinc-200">{user.email}</dd>
          <dt className="text-zinc-500">Verified</dt>
          <dd className={user.emailVerifiedAt ? "text-green-400" : "text-yellow-400"}>
            {user.emailVerifiedAt ? "Yes" : "Not verified"}
          </dd>
          <dt className="text-zinc-500">Account created</dt>
          <dd className="text-zinc-200">{user.createdAt.toLocaleString()}</dd>
          <dt className="text-zinc-500">Password</dt>
          <dd className="text-zinc-200">{user.passwordHash ? "Enabled" : "Not set"}</dd>
          <dt className="text-zinc-500">Google</dt>
          <dd className="text-zinc-200">{user.googleId ? "Connected" : "Not connected"}</dd>
        </dl>
      </section>

      <PasswordSection hasPassword={!!user.passwordHash} />
      <SessionsList sessions={rows} />
    </div>
  );
}
