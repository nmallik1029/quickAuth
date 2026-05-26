import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { loginAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-start justify-center gap-6 px-6">
      <h1 className="text-2xl font-semibold">Log in</h1>
      <AuthForm action={loginAction} submitLabel="Log in" />
      <p className="text-sm text-zinc-400">
        No account?{" "}
        <Link href="/signup" className="underline">
          Sign up
        </Link>
      </p>
      <Link href="/forgot-password" className="text-sm text-zinc-400 underline">
        Forgot password?
      </Link>
    </main>
  );
}
