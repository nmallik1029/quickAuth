import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/require-user";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { AvatarUpload } from "@/components/settings/AvatarUpload";

function initial(letter: string) {
  return letter.toUpperCase();
}

export default async function ProfileSettingsPage() {
  const user = await requireUser();
  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });

  const fallbackLetter =
    profile?.displayName?.[0] ?? profile?.username?.[0] ?? user.email[0] ?? "?";

  const hasPassword = !!user.passwordHash;
  const hasGoogle = !!user.googleId;

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="mt-1 text-sm text-zinc-400">How others see you on QuickAuth.</p>
      </header>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm">
        <p className="font-medium">{user.email}</p>
        <p className="text-xs text-zinc-400">
          {user.emailVerifiedAt ? "Email verified" : "Email not verified"}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Login methods: {[hasPassword && "Password", hasGoogle && "Google"].filter(Boolean).join(", ") || "none"}
        </p>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="mb-3 text-sm font-semibold">Avatar</h2>
        <AvatarUpload currentUrl={profile?.avatarUrl ?? null} fallback={initial(fallbackLetter)} />
      </section>

      <ProfileForm
        initial={{
          displayName: profile?.displayName ?? "",
          username: profile?.username ?? "",
          bio: profile?.bio ?? "",
        }}
      />
    </div>
  );
}
