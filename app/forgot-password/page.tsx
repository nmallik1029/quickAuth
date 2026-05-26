import Link from "next/link";
import { MessageForm } from "@/components/MessageForm";
import { forgotPasswordAction } from "@/app/actions/auth";

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-start justify-center gap-6 px-6">
      <h1 className="text-2xl font-semibold">Forgot password</h1>
      <MessageForm
        action={forgotPasswordAction}
        submitLabel="Send reset link"
        fields={[{ name: "email", label: "Email", type: "email", autoComplete: "email" }]}
      />
      <Link href="/login" className="text-sm underline">
        Back to login
      </Link>
    </main>
  );
}
