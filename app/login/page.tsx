import { redirect } from "next/navigation";
import { LoginCard } from "@/components/AuthCard";
import { loginAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <main className="relative flex min-h-screen items-center justify-center px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.18),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.12),transparent_55%)]"
      />
      <div className="relative">
        <LoginCard action={loginAction} />
      </div>
    </main>
  );
}
