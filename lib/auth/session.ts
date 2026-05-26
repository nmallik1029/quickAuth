import { prisma } from "@/lib/db";
import { generateToken, hashToken } from "./tokens";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export async function createSession(userId: string, meta?: { userAgent?: string | null; ipAddress?: string | null }) {
  const token = generateToken(32);
  const tokenHash = hashToken(token);
  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      userAgent: meta?.userAgent ?? null,
      ipAddress: meta?.ipAddress ?? null,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });
  return token;
}

export async function getSessionByToken(token: string) {
  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!session) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt < new Date()) return null;
  return session;
}

export async function revokeSessionByToken(token: string) {
  const tokenHash = hashToken(token);
  await prisma.session.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllUserSessions(userId: string) {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
