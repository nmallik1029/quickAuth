import Link from "next/link";
import { MessageForm } from "@/components/MessageForm";
import { forgotPasswordAction } from "@/app/actions/auth";

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-start justify-center gap-6 px-6">
      <h1 className="text-2xl font-semibold">Forgot password</h1>
      <p className="text-sm text-zinc-400">
        We&apos;ll email you a 6-digit reset code if an account exists.
      </p>
      <MessageForm
        action={forgotPasswordAction}
        submitLabel="Send reset code"
        fields={[{ name: "email", label: "Email", type: "email", autoComplete: "email" }]}
      />
      <Link href="/login" className="text-sm underline">
        Back to login
      </Link>
    </main>
  );
}
