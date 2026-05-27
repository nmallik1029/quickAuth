import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { approveOAuthAction, denyOAuthAction } from "@/app/actions/oauth";
import { createAuditLog } from "@/lib/audit";

function ErrorScreen({ title, detail }: { title: string; detail: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-start justify-center gap-3 px-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-sm text-zinc-400">{detail}</p>
    </main>
  );
}

export default async function OAuthAuthorizePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const clientId = typeof sp.client_id === "string" ? sp.client_id : "";
  const redirectUri = typeof sp.redirect_uri === "string" ? sp.redirect_uri : "";
  const responseType = typeof sp.response_type === "string" ? sp.response_type : "";
  const state = typeof sp.state === "string" ? sp.state : "";
  const scope = typeof sp.scope === "string" ? sp.scope : "";

  // Validate client + redirect FIRST. If invalid, render an error page (never bounce to attacker URI).
  if (!clientId) return <ErrorScreen title="Missing client_id" detail="The authorization request is malformed." />;
  if (!redirectUri) return <ErrorScreen title="Missing redirect_uri" detail="The authorization request is malformed." />;

  const app = await prisma.clientApp.findUnique({
    where: { clientId },
    include: { redirectUris: true },
  });
  if (!app || !app.isActive) {
    return <ErrorScreen title="Unknown application" detail="No active client found for this client_id." />;
  }
  if (!app.redirectUris.some((r) => r.uri === redirectUri)) {
    return <ErrorScreen title="Invalid redirect_uri" detail="The provided redirect_uri is not registered for this application." />;
  }

  // From here on, errors can safely be reported via redirect_uri.
  if (responseType !== "code") {
    const u = new URL(redirectUri);
    u.searchParams.set("error", "unsupported_response_type");
    if (state) u.searchParams.set("state", state);
    redirect(u.toString());
  }

  // Auth gate.
  const user = await getCurrentUser();
  if (!user) {
    const here = `/oauth/authorize?${new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      ...(state ? { state } : {}),
      ...(scope ? { scope } : {}),
    }).toString()}`;
    redirect(`/oauth/begin-login?next=${encodeURIComponent(here)}`);
  }

  await createAuditLog({
    action: "oauth.authorize.requested",
    actorUserId: user.id,
    targetUserId: user.id,
    metadata: { clientAppId: app.id, clientId, scope },
  });

  return (
    <main className="relative flex min-h-screen items-center justify-center px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.18),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.12),transparent_55%)]"
      />
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/60 p-7 shadow-2xl backdrop-blur">
        <div className="flex items-center gap-3">
          {app.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={app.logoUrl} alt="" className="h-10 w-10 rounded" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded bg-zinc-800 text-sm font-semibold">
              {app.name[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <div>
            <h1 className="text-lg font-semibold">{app.name}</h1>
            {app.homepageUrl ? (
              <a href={app.homepageUrl} className="text-xs text-zinc-400 hover:underline" target="_blank" rel="noreferrer">
                {new URL(app.homepageUrl).hostname}
              </a>
            ) : null}
          </div>
        </div>

        <p className="mt-5 text-sm text-zinc-300">
          <span className="font-medium">{app.name}</span> wants to access your QuickAuth account.
        </p>
        <ul className="mt-3 list-disc pl-5 text-sm text-zinc-400">
          <li>Your account ID</li>
          <li>Your email address</li>
          <li>Your username, display name, and avatar</li>
        </ul>

        <p className="mt-4 text-xs text-zinc-500">
          Signed in as <span className="font-medium text-zinc-300">{user.email}</span>. After approving, you&apos;ll be redirected to{" "}
          <span className="break-all font-mono text-zinc-400">{new URL(redirectUri).host}</span>.
        </p>

        <div className="mt-6 flex gap-2">
          <form action={denyOAuthAction} className="flex-1">
            <input type="hidden" name="client_id" value={clientId} />
            <input type="hidden" name="redirect_uri" value={redirectUri} />
            <input type="hidden" name="state" value={state} />
            <button
              type="submit"
              className="w-full rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-100 transition hover:bg-zinc-900"
            >
              Deny
            </button>
          </form>
          <form action={approveOAuthAction} className="flex-1">
            <input type="hidden" name="client_id" value={clientId} />
            <input type="hidden" name="redirect_uri" value={redirectUri} />
            <input type="hidden" name="state" value={state} />
            <input type="hidden" name="scope" value={scope} />
            <button
              type="submit"
              className="w-full rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200"
            >
              Allow
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
