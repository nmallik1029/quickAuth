import { redirect } from "next/navigation";
import { LoginCard } from "@/components/AuthCard";
import { loginAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getLoginBranding } from "@/lib/oauth/branding";

const errorMessages: Record<string, string> = {
  rate_limited: "Too many attempts. Please try again later.",
  google_not_configured: "Google sign-in is not configured.",
  google_state_invalid: "Google sign-in failed (state mismatch). Please try again.",
  google_exchange_failed: "Could not complete Google sign-in. Please try again.",
  google_email_unverified: "Your Google email is not verified.",
  account_disabled: "This account has been disabled.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getCurrentUser()) redirect("/dashboard");
  const { error } = await searchParams;
  const errorMsg = error ? errorMessages[error] ?? null : null;
  const branding = await getLoginBranding();

  const customBg = branding?.bgImageUrl
    ? { backgroundImage: `url(${branding.bgImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
    : branding?.bgColor
      ? { backgroundColor: branding.bgColor }
      : undefined;

  return (
    <main className="relative flex min-h-screen items-center justify-center px-6" style={customBg}>
      {!customBg && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.18),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.12),transparent_55%)]"
        />
      )}
      <div className="relative">
        {errorMsg ? (
          <div className="mx-auto mb-3 w-full max-w-sm rounded-md border border-red-700/40 bg-red-900/20 px-3 py-2 text-sm text-red-300">
            {errorMsg}
          </div>
        ) : null}
        <LoginCard action={loginAction} branding={branding} />
      </div>
    </main>
  );
}
