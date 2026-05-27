"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/require-user";
import { createAuthorizationCode } from "@/lib/oauth/codes";
import { createAuditLog } from "@/lib/audit";

export async function approveOAuthAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const clientId = String(formData.get("client_id") ?? "");
  const redirectUri = String(formData.get("redirect_uri") ?? "");
  const state = String(formData.get("state") ?? "");
  const scope = String(formData.get("scope") ?? "") || null;

  const app = await prisma.clientApp.findUnique({
    where: { clientId },
    include: { redirectUris: true },
  });
  if (!app || !app.isActive) redirect("/oauth/authorize?error=invalid_client");
  if (!app.redirectUris.some((r) => r.uri === redirectUri)) {
    redirect("/oauth/authorize?error=invalid_redirect");
  }

  const code = await createAuthorizationCode({
    clientAppId: app.id,
    userId: user.id,
    redirectUri,
    scope,
  });

  await createAuditLog({
    action: "oauth.authorize.granted",
    actorUserId: user.id,
    targetUserId: user.id,
    metadata: { clientAppId: app.id, clientId, scope },
  });

  const url = new URL(redirectUri);
  url.searchParams.set("code", code);
  if (state) url.searchParams.set("state", state);
  redirect(url.toString());
}

export async function denyOAuthAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const clientId = String(formData.get("client_id") ?? "");
  const redirectUri = String(formData.get("redirect_uri") ?? "");
  const state = String(formData.get("state") ?? "");

  const app = await prisma.clientApp.findUnique({
    where: { clientId },
    include: { redirectUris: true },
  });
  if (!app || !app.redirectUris.some((r) => r.uri === redirectUri)) {
    redirect("/dashboard");
  }

  await createAuditLog({
    action: "oauth.authorize.denied",
    actorUserId: user.id,
    targetUserId: user.id,
    metadata: { clientId },
  });

  const url = new URL(redirectUri);
  url.searchParams.set("error", "access_denied");
  if (state) url.searchParams.set("state", state);
  redirect(url.toString());
}
