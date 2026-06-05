import { prisma } from "@/lib/db";
import { generateToken, hashToken } from "@/lib/auth/tokens";

const CODE_TTL_MS = 60 * 1000; // 60s
const ACCESS_TOKEN_TTL_MS = 1000 * 60 * 60; // 1h

export async function createAuthorizationCode(opts: {
  clientAppId: string;
  userId: string;
  redirectUri: string;
  scope?: string | null;
}): Promise<string> {
  const code = generateToken(32);
  await prisma.authorizationCode.create({
    data: {
      clientAppId: opts.clientAppId,
      userId: opts.userId,
      redirectUri: opts.redirectUri,
      codeHash: hashToken(code),
      scope: opts.scope ?? null,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });
  return code;
}

export type OAuthUserInfo = {
  id: string;
  email: string;
  email_verified: boolean;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  must_change_password: boolean;
};

export async function consumeAuthorizationCode(opts: {
  rawCode: string;
  clientAppId: string;
  redirectUri: string;
}): Promise<
  | { ok: true; userId: string; scope: string | null; user: OAuthUserInfo }
  | { ok: false; reason: string }
> {
  const codeHash = hashToken(opts.rawCode);
  // Load the user alongside the code so the token response can embed the profile
  // and clients don't need a second /oauth/userinfo round trip.
  const record = await prisma.authorizationCode.findUnique({
    where: { codeHash },
    include: { user: { include: { profile: true } } },
  });
  if (!record) return { ok: false, reason: "invalid_grant" };
  if (record.usedAt) return { ok: false, reason: "invalid_grant" };
  if (record.expiresAt < new Date()) return { ok: false, reason: "invalid_grant" };
  if (record.clientAppId !== opts.clientAppId) return { ok: false, reason: "invalid_grant" };
  if (record.redirectUri !== opts.redirectUri) return { ok: false, reason: "invalid_grant" };

  await prisma.authorizationCode.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  const u = record.user;
  return {
    ok: true,
    userId: record.userId,
    scope: record.scope,
    user: {
      id: u.id,
      email: u.email,
      email_verified: !!u.emailVerifiedAt,
      username: u.profile?.username ?? null,
      display_name: u.profile?.displayName ?? null,
      avatar_url: u.profile?.avatarUrl ?? null,
      must_change_password: u.mustChangePassword,
    },
  };
}

export async function createAccessToken(opts: {
  clientAppId: string;
  userId: string;
  scope?: string | null;
  ttlMs?: number;
}): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken(48);
  const ttl = opts.ttlMs ?? ACCESS_TOKEN_TTL_MS;
  const expiresAt = new Date(Date.now() + ttl);
  await prisma.accessToken.create({
    data: {
      clientAppId: opts.clientAppId,
      userId: opts.userId,
      tokenHash: hashToken(token),
      scope: opts.scope ?? null,
      expiresAt,
    },
  });
  return { token, expiresAt };
}

export async function getAccessToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.accessToken.findUnique({
    where: { tokenHash },
    include: { user: { include: { profile: true } }, clientApp: true },
  });
  if (!record) return null;
  if (record.revokedAt) return null;
  if (record.expiresAt < new Date()) return null;
  if (!record.clientApp.isActive) return null;
  if (record.user.disabledAt) return null;
  return record;
}
