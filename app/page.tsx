import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function HomePage() {
  const user = await getCurrentUser();
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-start justify-center gap-6 px-6">
      <h1 className="text-3xl font-semibold">quickAuth</h1>
      <p className="text-zinc-400">Self-hosted authentication starter.</p>
      <div className="flex gap-3">
        {user ? (
          <Link className="rounded bg-white px-4 py-2 text-sm font-medium text-black" href="/dashboard">
            Go to dashboard
          </Link>
        ) : (
          <>
            <Link className="rounded bg-white px-4 py-2 text-sm font-medium text-black" href="/signup">
              Sign up
            </Link>
            <Link className="rounded border border-zinc-700 px-4 py-2 text-sm font-medium" href="/login">
              Log in
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
