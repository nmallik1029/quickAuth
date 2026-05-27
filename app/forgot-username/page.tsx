import Link from "next/link";
import { MessageForm } from "@/components/MessageForm";
import { forgotUsernameAction } from "@/app/actions/auth";

export default function ForgotUsernamePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-start justify-center gap-6 px-6">
      <h1 className="text-2xl font-semibold">Forgot username</h1>
      <p className="text-sm text-zinc-400">
        Enter your email and we&apos;ll send your username if an account exists.
      </p>
      <MessageForm
        action={forgotUsernameAction}
        submitLabel="Send username"
        fields={[{ name: "email", label: "Email", type: "email", autoComplete: "email" }]}
      />
      <Link href="/login" className="text-sm underline">
        Back to login
      </Link>
    </main>
  );
}
