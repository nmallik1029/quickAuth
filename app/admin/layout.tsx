import Link from "next/link";
import { requireAdmin } from "@/lib/admin/require-admin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl gap-8 px-6 py-10">
      <aside className="w-48 shrink-0">
        <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-200">
          &larr; Dashboard
        </Link>
        <h2 className="mt-6 text-xs font-semibold uppercase tracking-wider text-zinc-500">Admin</h2>
        <nav className="mt-2 flex flex-col gap-1 text-sm">
          <Link href="/admin" className="rounded px-2 py-1.5 text-zinc-200 hover:bg-zinc-900">Overview</Link>
          <Link href="/admin/users" className="rounded px-2 py-1.5 text-zinc-200 hover:bg-zinc-900">Users</Link>
          <Link href="/admin/audit-logs" className="rounded px-2 py-1.5 text-zinc-200 hover:bg-zinc-900">Audit logs</Link>
        </nav>
      </aside>
      <main className="flex-1">{children}</main>
    </div>
  );
}
