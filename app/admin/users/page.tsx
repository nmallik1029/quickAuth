import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const users = await prisma.user.findMany({
    where: query
      ? {
          OR: [
            { emailNormalized: { contains: query.toLowerCase() } },
            { profile: { usernameNormalized: { contains: query.toLowerCase() } } },
            { profile: { displayName: { contains: query } } },
          ],
        }
      : undefined,
    include: { profile: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="mt-1 text-sm text-zinc-400">Search and manage accounts.</p>
        </div>
        <form method="get" className="flex gap-2">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search email, username, display name"
            className="w-72 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-zinc-400"
          />
          <button className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-900">
            Search
          </button>
        </form>
      </header>

      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900/60 text-xs uppercase tracking-wider text-zinc-400">
            <tr>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Username</th>
              <th className="px-3 py-2">Display name</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Last login</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {users.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-zinc-500">
                  No users found.
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-zinc-900/40">
                <td className="px-3 py-2">
                  <Link href={`/admin/users/${u.id}`} className="text-zinc-100 hover:underline">
                    {u.email}
                  </Link>
                </td>
                <td className="px-3 py-2 text-zinc-300">{u.profile?.username ?? "—"}</td>
                <td className="px-3 py-2 text-zinc-300">{u.profile?.displayName ?? "—"}</td>
                <td className="px-3 py-2">
                  <span className={u.role === "admin" ? "text-violet-300" : "text-zinc-400"}>{u.role}</span>
                </td>
                <td className="px-3 py-2">
                  {u.disabledAt ? (
                    <span className="text-red-400">disabled</span>
                  ) : u.emailVerifiedAt ? (
                    <span className="text-green-400">verified</span>
                  ) : (
                    <span className="text-yellow-400">unverified</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-zinc-500">{u.createdAt.toLocaleDateString()}</td>
                <td className="px-3 py-2 text-xs text-zinc-500">
                  {u.lastLoginAt ? u.lastLoginAt.toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
