import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSecret } from "@/app/actions/client-apps";
import { AppEditForm } from "@/components/admin/AppEditForm";
import { RedirectUrisPanel } from "@/components/admin/RedirectUrisPanel";
import { AppDangerButtons } from "@/components/admin/AppDangerButtons";
import { CopyableField } from "@/components/admin/CopyableField";

export default async function AdminAppDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const app = await prisma.clientApp.findUnique({
    where: { id },
    include: { redirectUris: { orderBy: { createdAt: "asc" } } },
  });
  if (!app) notFound();

  const rawSecret = await readSecret(app.id);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <Link href="/admin/apps" className="text-sm text-zinc-400 hover:text-zinc-200">
          &larr; Client apps
        </Link>
        <div className="mt-2 flex items-center gap-3">
          {app.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={app.logoUrl} alt="" className="h-10 w-10 rounded" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded bg-zinc-800 text-sm font-semibold">
              {app.name[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-semibold">{app.name}</h1>
            <p className="text-sm text-zinc-400">{app.slug}</p>
          </div>
          <div className="ml-auto text-xs">
            {app.isActive ? (
              <span className="rounded-full bg-green-900/40 px-2 py-0.5 text-green-300">Active</span>
            ) : (
              <span className="rounded-full bg-red-900/40 px-2 py-0.5 text-red-300">Inactive</span>
            )}
          </div>
        </div>
      </header>

      {rawSecret && (
        <section className="rounded-xl border border-yellow-700/50 bg-yellow-950/20 p-5">
          <h2 className="text-sm font-semibold text-yellow-200">Copy your client secret now</h2>
          <p className="mt-1 text-xs text-yellow-300/80">
            This is the only time the raw secret will be shown. Store it somewhere safe — you can&apos;t retrieve it again, only regenerate it.
          </p>
          <div className="mt-3">
            <CopyableField value={rawSecret} />
          </div>
        </section>
      )}

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="mb-3 text-sm font-semibold">Credentials</h2>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <p className="mb-1 text-xs uppercase tracking-wider text-zinc-500">client_id</p>
            <CopyableField value={app.clientId} />
          </div>
          <div>
            <p className="mb-1 text-xs uppercase tracking-wider text-zinc-500">client_secret</p>
            <CopyableField value="(hidden — regenerate to issue a new one)" />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="mb-3 text-sm font-semibold">Details</h2>
        <AppEditForm
          id={app.id}
          initial={{
            name: app.name,
            description: app.description ?? "",
            homepageUrl: app.homepageUrl ?? "",
            logoUrl: app.logoUrl ?? "",
          }}
        />
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="mb-3 text-sm font-semibold">Redirect URIs</h2>
        <RedirectUrisPanel
          appId={app.id}
          items={app.redirectUris.map((r) => ({ id: r.id, uri: r.uri }))}
        />
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="mb-1 text-sm font-semibold">Danger zone</h2>
        <p className="mb-3 text-xs text-zinc-500">
          Deactivating disables sign-in for this app. Regenerating the secret invalidates all current access tokens.
        </p>
        <AppDangerButtons appId={app.id} isActive={app.isActive} />
      </section>
    </div>
  );
}
