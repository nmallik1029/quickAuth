import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6">
      <ResetPasswordForm initialEmail={email ?? ""} />
    </main>
  );
}
