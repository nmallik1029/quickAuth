import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/require-admin";
import { UserActions } from "@/components/admin/UserActions";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-zinc-500">{label}</dt>
      <dd className="text-zinc-200">{children}</dd>
    </>
  );
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: { profile: true },
  });
  if (!user) notFound();

  const sessions = await prisma.session.findMany({
    where: { userId: id, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  const audit = await prisma.auditLog.findMany({
    where: { OR: [{ actorUserId: id }, { targetUserId: id }] },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const isSelf = admin.id === user.id;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <Link href="/admin/users" className="text-sm text-zinc-400 hover:text-zinc-200">
          &larr; Users
        </Link>
        <div className="mt-2 flex items-center gap-4">
          {user.profile?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.profile.avatarUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800 text-lg font-semibold">
              {(user.profile?.displayName?.[0] ?? user.profile?.username?.[0] ?? user.email[0] ?? "?").toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-semibold">{user.email}</h1>
            <p className="text-sm text-zinc-400">{user.profile?.username ?? "no username"}</p>
          </div>
        </div>
      </header>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="mb-3 text-sm font-semibold">Account</h2>
        <dl className="grid grid-cols-[160px_1fr] gap-y-1.5 text-xs">
          <Field label="ID">{user.id}</Field>
          <Field label="Display name">{user.profile?.displayName ?? "—"}</Field>
          <Field label="Bio">{user.profile?.bio ?? "—"}</Field>
          <Field label="Role">
            <span className={user.role === "admin" ? "text-violet-300" : "text-zinc-200"}>{user.role}</span>
          </Field>
          <Field label="Email verified">
            {user.emailVerifiedAt ? (
              <span className="text-green-400">{user.emailVerifiedAt.toLocaleString()}</span>
            ) : (
              <span className="text-yellow-400">No</span>
            )}
          </Field>
          <Field label="Status">
            {user.disabledAt ? (
              <span className="text-red-400">Disabled at {user.disabledAt.toLocaleString()}</span>
            ) : (
              <span className="text-green-400">Active</span>
            )}
          </Field>
          <Field label="Login methods">
            {[user.passwordHash && "Password", user.googleId && "Google"].filter(Boolean).join(", ") || "none"}
          </Field>
          <Field label="Created">{user.createdAt.toLocaleString()}</Field>
          <Field label="Updated">{user.updatedAt.toLocaleString()}</Field>
          <Field label="Last login">{user.lastLoginAt ? user.lastLoginAt.toLocaleString() : "—"}</Field>
        </dl>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="mb-3 text-sm font-semibold">Actions</h2>
        <UserActions
          userId={user.id}
          isSelf={isSelf}
          isDisabled={!!user.disabledAt}
          isVerified={!!user.emailVerifiedAt}
          role={user.role === "admin" ? "admin" : "user"}
        />
        {isSelf && (
          <p className="mt-3 text-xs text-zinc-500">You cannot disable or demote yourself.</p>
        )}
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="mb-3 text-sm font-semibold">Active sessions ({sessions.length})</h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-zinc-500">No active sessions.</p>
        ) : (
          <ul className="divide-y divide-zinc-800 text-xs">
            {sessions.map((s) => (
              <li key={s.id} className="py-2">
                <p className="text-zinc-200">{s.userAgent ?? "Unknown device"}</p>
                <p className="text-zinc-500">
                  {s.ipAddress ?? "no ip"} · Started {s.createdAt.toLocaleString()} · Expires {s.expiresAt.toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="mb-3 text-sm font-semibold">Recent audit logs</h2>
        {audit.length === 0 ? (
          <p className="text-sm text-zinc-500">No recent activity.</p>
        ) : (
          <ul className="divide-y divide-zinc-800 text-xs">
            {audit.map((a) => (
              <li key={a.id} className="py-2">
                <p className="font-mono text-zinc-200">{a.action}</p>
                <p className="text-zinc-500">
                  {a.createdAt.toLocaleString()}
                  {a.ipAddress ? ` · ${a.ipAddress}` : ""}
                  {a.metadata ? ` · ${a.metadata}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
