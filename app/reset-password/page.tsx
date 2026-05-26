import Link from "next/link";
import { MessageForm } from "@/components/MessageForm";
import { resetPasswordAction } from "@/app/actions/auth";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-start justify-center gap-4 px-6">
        <h1 className="text-2xl font-semibold">Reset password</h1>
        <p className="text-sm text-red-400">Missing token.</p>
        <Link href="/forgot-password" className="text-sm underline">
          Request a new link
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-start justify-center gap-6 px-6">
      <h1 className="text-2xl font-semibold">Choose a new password</h1>
      <MessageForm
        action={resetPasswordAction}
        submitLabel="Reset password"
        hidden={{ token }}
        fields={[
          {
            name: "password",
            label: "New password",
            type: "password",
            minLength: 8,
            autoComplete: "new-password",
          },
        ]}
      />
    </main>
  );
}
