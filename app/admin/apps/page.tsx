import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function AdminAppsPage() {
  const apps = await prisma.clientApp.findMany({
    include: { _count: { select: { redirectUris: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Client apps</h1>
          <p className="mt-1 text-sm text-zinc-400">External applications that can sign in users via QuickAuth.</p>
        </div>
        <Link
          href="/admin/apps/new"
          className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-black hover:bg-zinc-200"
        >
          New app
        </Link>
      </header>

      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900/60 text-xs uppercase tracking-wider text-zinc-400">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Slug</th>
              <th className="px-3 py-2">client_id</th>
              <th className="px-3 py-2">Redirects</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {apps.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-zinc-500">
                  No client apps yet.
                </td>
              </tr>
            )}
            {apps.map((a) => (
              <tr key={a.id} className="hover:bg-zinc-900/40">
                <td className="px-3 py-2">
                  <Link href={`/admin/apps/${a.id}`} className="text-zinc-100 hover:underline">
                    {a.name}
                  </Link>
                  {a.homepageUrl && (
                    <p className="text-[11px] text-zinc-500">{new URL(a.homepageUrl).hostname}</p>
                  )}
                </td>
                <td className="px-3 py-2 text-zinc-300">{a.slug}</td>
                <td className="px-3 py-2 font-mono text-xs text-zinc-400">{a.clientId}</td>
                <td className="px-3 py-2 text-zinc-300">{a._count.redirectUris}</td>
                <td className="px-3 py-2">
                  {a.isActive ? (
                    <span className="text-green-400">active</span>
                  ) : (
                    <span className="text-red-400">inactive</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-zinc-500">{a.createdAt.toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
