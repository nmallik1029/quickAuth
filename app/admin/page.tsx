import { prisma } from "@/lib/db";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

export default async function AdminHomePage() {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 1000 * 60 * 60 * 24);

  const [
    totalUsers,
    verifiedUsers,
    disabledUsers,
    activeSessions,
    auditCount24h,
    loginFailures24h,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { emailVerifiedAt: { not: null } } }),
    prisma.user.count({ where: { disabledAt: { not: null } } }),
    prisma.session.count({ where: { revokedAt: null, expiresAt: { gt: now } } }),
    prisma.auditLog.count({ where: { createdAt: { gt: dayAgo } } }),
    prisma.auditLog.count({ where: { action: "login.failure", createdAt: { gt: dayAgo } } }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="mt-1 text-sm text-zinc-400">Quick stats for the last 24 hours.</p>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Stat label="Total users" value={totalUsers} />
        <Stat label="Verified" value={verifiedUsers} />
        <Stat label="Disabled" value={disabledUsers} />
        <Stat label="Active sessions" value={activeSessions} />
        <Stat label="Audit events (24h)" value={auditCount24h} />
        <Stat label="Login failures (24h)" value={loginFailures24h} />
      </div>
    </div>
  );
}
