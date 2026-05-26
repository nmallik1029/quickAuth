import Link from "next/link";
import { verifyEmailAction } from "@/app/actions/auth";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = token ? await verifyEmailAction(token) : { ok: false };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-start justify-center gap-4 px-6">
      <h1 className="text-2xl font-semibold">Email verification</h1>
      {token ? (
        result.ok ? (
          <p className="text-sm text-green-400">Your email has been verified.</p>
        ) : (
          <p className="text-sm text-red-400">Invalid or expired verification link.</p>
        )
      ) : (
        <p className="text-sm text-zinc-400">No token provided.</p>
      )}
      <Link href="/dashboard" className="underline text-sm">
        Go to dashboard
      </Link>
    </main>
  );
}
