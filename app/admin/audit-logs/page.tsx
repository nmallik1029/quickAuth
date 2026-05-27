import Link from "next/link";
import { prisma } from "@/lib/db";

const PAGE_SIZE = 50;

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const action = (sp.action ?? "").trim();
  const q = (sp.q ?? "").trim().toLowerCase();
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  // Resolve q -> userIds (by email or username)
  let userIds: string[] | null = null;
  if (q) {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { emailNormalized: { contains: q } },
          { profile: { usernameNormalized: { contains: q } } },
        ],
      },
      select: { id: true },
      take: 50,
    });
    userIds = users.map((u) => u.id);
    if (userIds.length === 0) userIds = ["__none__"];
  }

  const where = {
    ...(action ? { action } : {}),
    ...(userIds
      ? { OR: [{ actorUserId: { in: userIds } }, { targetUserId: { in: userIds } }] }
      : {}),
  };

  const [logs, total, distinctActions] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      distinct: ["action"],
      select: { action: true },
      orderBy: { action: "asc" },
    }),
  ]);

  const userIdsInPage = Array.from(
    new Set(
      logs
        .flatMap((l) => [l.actorUserId, l.targetUserId])
        .filter((v): v is string => !!v),
    ),
  );
  const users = await prisma.user.findMany({
    where: { id: { in: userIdsInPage } },
    select: { id: true, email: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u.email]));

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Audit logs</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {total.toLocaleString()} events · page {page} of {pages}
          </p>
        </div>
      </header>

      <form method="get" className="flex flex-wrap gap-2">
        <select
          name="action"
          defaultValue={action}
          className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-zinc-400"
        >
          <option value="">All actions</option>
          {distinctActions.map((a) => (
            <option key={a.action} value={a.action}>
              {a.action}
            </option>
          ))}
        </select>
        <input
          name="q"
          defaultValue={q}
          placeholder="email or username"
          className="w-64 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-zinc-400"
        />
        <button className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-900">
          Filter
        </button>
        {(action || q) && (
          <Link
            href="/admin/audit-logs"
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-900"
          >
            Clear
          </Link>
        )}
      </form>

      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-900/60 uppercase tracking-wider text-zinc-400">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Actor</th>
              <th className="px-3 py-2">Target</th>
              <th className="px-3 py-2">IP</th>
              <th className="px-3 py-2">Metadata</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {logs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-zinc-500">
                  No audit logs found.
                </td>
              </tr>
            )}
            {logs.map((l) => (
              <tr key={l.id} className="hover:bg-zinc-900/40 align-top">
                <td className="px-3 py-2 text-zinc-500">{l.createdAt.toLocaleString()}</td>
                <td className="px-3 py-2 font-mono text-zinc-200">{l.action}</td>
                <td className="px-3 py-2">
                  {l.actorUserId ? (
                    <Link href={`/admin/users/${l.actorUserId}`} className="text-zinc-300 hover:underline">
                      {userMap.get(l.actorUserId) ?? l.actorUserId.slice(0, 8)}
                    </Link>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {l.targetUserId ? (
                    <Link href={`/admin/users/${l.targetUserId}`} className="text-zinc-300 hover:underline">
                      {userMap.get(l.targetUserId) ?? l.targetUserId.slice(0, 8)}
                    </Link>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-zinc-500">{l.ipAddress ?? "—"}</td>
                <td className="px-3 py-2 max-w-sm truncate text-zinc-400" title={l.metadata ?? ""}>
                  {l.metadata ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav className="flex items-center justify-center gap-2 text-xs">
          {page > 1 && (
            <Link
              href={`/admin/audit-logs?${new URLSearchParams({ ...(action ? { action } : {}), ...(q ? { q } : {}), page: String(page - 1) })}`}
              className="rounded-md border border-zinc-700 px-3 py-1.5 hover:bg-zinc-900"
            >
              ← Prev
            </Link>
          )}
          <span className="text-zinc-500">
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Link
              href={`/admin/audit-logs?${new URLSearchParams({ ...(action ? { action } : {}), ...(q ? { q } : {}), page: String(page + 1) })}`}
              className="rounded-md border border-zinc-700 px-3 py-1.5 hover:bg-zinc-900"
            >
              Next →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
