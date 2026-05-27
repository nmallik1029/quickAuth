"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/require-admin";
import { createAuditLog } from "@/lib/audit";
import {
  generateClientId,
  generateClientSecret,
  hashClientSecret,
} from "@/lib/auth/client-apps";
import {
  validateAppName,
  validateSlug,
  validateDescription,
  validateHttpUrl,
  validateRedirectUriString,
} from "@/lib/client-apps/validation";

const SECRET_COOKIE_PREFIX = "qa_new_secret_";

export type ClientAppState = { error?: string; message?: string };

function readRedirectList(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function stashSecret(appId: string, raw: string) {
  const jar = await cookies();
  jar.set(`${SECRET_COOKIE_PREFIX}${appId}`, raw, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 5,
  });
}

export async function readAndClearSecret(appId: string): Promise<string | null> {
  const jar = await cookies();
  const v = jar.get(`${SECRET_COOKIE_PREFIX}${appId}`)?.value ?? null;
  if (v) jar.delete(`${SECRET_COOKIE_PREFIX}${appId}`);
  return v;
}

export async function createClientAppAction(
  _prev: ClientAppState,
  formData: FormData,
): Promise<ClientAppState> {
  const admin = await requireAdmin();

  const name = String(formData.get("name") ?? "");
  const slug = String(formData.get("slug") ?? "").toLowerCase();
  const description = String(formData.get("description") ?? "");
  const homepageUrl = String(formData.get("homepageUrl") ?? "");
  const logoUrl = String(formData.get("logoUrl") ?? "");
  const redirectsRaw = String(formData.get("redirectUris") ?? "");

  const nameErr = validateAppName(name);
  if (nameErr) return { error: nameErr };
  const slugErr = validateSlug(slug);
  if (slugErr) return { error: slugErr };
  const descErr = validateDescription(description);
  if (descErr) return { error: descErr };
  const homeErr = validateHttpUrl(homepageUrl || null, "Homepage URL");
  if (homeErr) return { error: homeErr };
  const logoErr = validateHttpUrl(logoUrl || null, "Logo URL");
  if (logoErr) return { error: logoErr };

  const uris = readRedirectList(redirectsRaw);
  if (uris.length === 0) return { error: "At least one redirect URI is required." };
  const cleanUris: string[] = [];
  for (const u of uris) {
    const v = validateRedirectUriString(u);
    if (!v.ok) return { error: v.error };
    if (cleanUris.includes(v.uri)) continue;
    cleanUris.push(v.uri);
  }

  const slugTaken = await prisma.clientApp.findUnique({ where: { slug } });
  if (slugTaken) return { error: "That slug is already taken." };

  const clientId = generateClientId();
  const clientSecret = generateClientSecret();

  const app = await prisma.clientApp.create({
    data: {
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim() || null,
      homepageUrl: homepageUrl.trim() || null,
      logoUrl: logoUrl.trim() || null,
      clientId,
      clientSecretHash: hashClientSecret(clientSecret),
      redirectUris: { create: cleanUris.map((uri) => ({ uri })) },
    },
  });

  await stashSecret(app.id, clientSecret);
  await createAuditLog({
    action: "client_app.created",
    actorUserId: admin.id,
    metadata: { clientAppId: app.id, clientId: app.clientId },
  });

  redirect(`/admin/apps/${app.id}?new=1`);
}

export async function updateClientAppAction(
  _prev: ClientAppState,
  formData: FormData,
): Promise<ClientAppState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing id." };

  const name = String(formData.get("name") ?? "");
  const description = String(formData.get("description") ?? "");
  const homepageUrl = String(formData.get("homepageUrl") ?? "");
  const logoUrl = String(formData.get("logoUrl") ?? "");

  const nameErr = validateAppName(name);
  if (nameErr) return { error: nameErr };
  const descErr = validateDescription(description);
  if (descErr) return { error: descErr };
  const homeErr = validateHttpUrl(homepageUrl || null, "Homepage URL");
  if (homeErr) return { error: homeErr };
  const logoErr = validateHttpUrl(logoUrl || null, "Logo URL");
  if (logoErr) return { error: logoErr };

  await prisma.clientApp.update({
    where: { id },
    data: {
      name: name.trim(),
      description: description.trim() || null,
      homepageUrl: homepageUrl.trim() || null,
      logoUrl: logoUrl.trim() || null,
    },
  });

  await createAuditLog({
    action: "client_app.updated",
    actorUserId: admin.id,
    metadata: { clientAppId: id },
  });
  revalidatePath(`/admin/apps/${id}`);
  return { message: "Saved." };
}

export async function addRedirectUriAction(appId: string, uri: string): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  const v = validateRedirectUriString(uri);
  if (!v.ok) return { ok: false, error: v.error };

  const existing = await prisma.redirectUri.findFirst({
    where: { clientAppId: appId, uri: v.uri },
  });
  if (existing) return { ok: false, error: "That redirect URI is already added." };

  await prisma.redirectUri.create({ data: { clientAppId: appId, uri: v.uri } });
  await createAuditLog({
    action: "client_app.redirect_uri.added",
    actorUserId: admin.id,
    metadata: { clientAppId: appId, uri: v.uri },
  });
  revalidatePath(`/admin/apps/${appId}`);
  return { ok: true };
}

export async function removeRedirectUriAction(redirectId: string): Promise<void> {
  const admin = await requireAdmin();
  const r = await prisma.redirectUri.findUnique({ where: { id: redirectId } });
  if (!r) return;
  await prisma.redirectUri.delete({ where: { id: redirectId } });
  await createAuditLog({
    action: "client_app.redirect_uri.removed",
    actorUserId: admin.id,
    metadata: { clientAppId: r.clientAppId, uri: r.uri },
  });
  revalidatePath(`/admin/apps/${r.clientAppId}`);
}

export async function setClientAppActiveAction(appId: string, isActive: boolean): Promise<void> {
  const admin = await requireAdmin();
  await prisma.clientApp.update({ where: { id: appId }, data: { isActive } });
  await createAuditLog({
    action: isActive ? "client_app.activated" : "client_app.deactivated",
    actorUserId: admin.id,
    metadata: { clientAppId: appId },
  });
  revalidatePath(`/admin/apps/${appId}`);
}

export async function regenerateClientSecretAction(appId: string): Promise<void> {
  const admin = await requireAdmin();
  const newSecret = generateClientSecret();
  await prisma.clientApp.update({
    where: { id: appId },
    data: { clientSecretHash: hashClientSecret(newSecret) },
  });
  // Revoke all outstanding access tokens for this app.
  await prisma.accessToken.updateMany({
    where: { clientAppId: appId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  await stashSecret(appId, newSecret);
  await createAuditLog({
    action: "client_app.secret_regenerated",
    actorUserId: admin.id,
    metadata: { clientAppId: appId },
  });
  redirect(`/admin/apps/${appId}?new=1`);
}
