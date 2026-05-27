import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl gap-8 px-6 py-10">
      <aside className="w-48 shrink-0">
        <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-200">
          &larr; Dashboard
        </Link>
        <h2 className="mt-6 text-xs font-semibold uppercase tracking-wider text-zinc-500">Settings</h2>
        <nav className="mt-2 flex flex-col gap-1 text-sm">
          <Link href="/settings/profile" className="rounded px-2 py-1.5 text-zinc-200 hover:bg-zinc-900">
            Profile
          </Link>
          <Link href="/settings/security" className="rounded px-2 py-1.5 text-zinc-200 hover:bg-zinc-900">
            Security
          </Link>
        </nav>
      </aside>
      <main className="flex-1">{children}</main>
    </div>
  );
}
