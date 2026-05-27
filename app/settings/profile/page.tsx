import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/require-user";
import { ProfileForm } from "@/components/settings/ProfileForm";

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

      <section className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        {profile?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatarUrl}
            alt="Avatar"
            className="h-14 w-14 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800 text-lg font-semibold text-zinc-200">
            {initial(fallbackLetter)}
          </div>
        )}
        <div className="text-sm">
          <p className="font-medium">{user.email}</p>
          <p className="text-xs text-zinc-400">
            {user.emailVerifiedAt ? "Email verified" : "Email not verified"}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Login methods: {[hasPassword && "Password", hasGoogle && "Google"].filter(Boolean).join(", ") || "none"}
          </p>
        </div>
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
