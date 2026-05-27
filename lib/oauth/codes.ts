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

export async function consumeAuthorizationCode(opts: {
  rawCode: string;
  clientAppId: string;
  redirectUri: string;
}): Promise<
  | { ok: true; userId: string; scope: string | null }
  | { ok: false; reason: string }
> {
  const codeHash = hashToken(opts.rawCode);
  const record = await prisma.authorizationCode.findUnique({ where: { codeHash } });
  if (!record) return { ok: false, reason: "invalid_grant" };
  if (record.usedAt) return { ok: false, reason: "invalid_grant" };
  if (record.expiresAt < new Date()) return { ok: false, reason: "invalid_grant" };
  if (record.clientAppId !== opts.clientAppId) return { ok: false, reason: "invalid_grant" };
  if (record.redirectUri !== opts.redirectUri) return { ok: false, reason: "invalid_grant" };

  await prisma.authorizationCode.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return { ok: true, userId: record.userId, scope: record.scope };
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
