import Link from "next/link";
import { NewAppForm } from "@/components/admin/NewAppForm";

export default function NewAppPage() {
  return (
    <div className="flex max-w-xl flex-col gap-6">
      <header>
        <Link href="/admin/apps" className="text-sm text-zinc-400 hover:text-zinc-200">
          &larr; Client apps
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">New client app</h1>
        <p className="mt-1 text-sm text-zinc-400">Register an external application that will sign in users via QuickAuth.</p>
      </header>
      <NewAppForm />
    </div>
  );
}
