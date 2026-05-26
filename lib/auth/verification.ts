import { prisma } from "@/lib/db";
import { generateToken, hashToken } from "./tokens";
import { sendEmail, appUrl } from "@/lib/email";

const VERIFY_TTL_MS = 1000 * 60 * 60 * 24;
const RESET_TTL_MS = 1000 * 60 * 60;

export async function createAndSendVerification(userId: string, email: string) {
  const token = generateToken(32);
  await prisma.emailVerificationToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + VERIFY_TTL_MS),
    },
  });
  const link = appUrl(`/verify-email?token=${token}`);
  await sendEmail({
    to: email,
    subject: "Verify your email",
    html: `<p>Click to verify your email:</p><p><a href="${link}">${link}</a></p><p>Expires in 24 hours.</p>`,
  });
}

export async function consumeVerificationToken(rawToken: string): Promise<{ ok: boolean; userId?: string }> {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt < new Date()) return { ok: false };
  await prisma.$transaction([
    prisma.emailVerificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
  ]);
  return { ok: true, userId: record.userId };
}

export async function createAndSendPasswordReset(userId: string, email: string) {
  const token = generateToken(32);
  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    },
  });
  const link = appUrl(`/reset-password?token=${token}`);
  await sendEmail({
    to: email,
    subject: "Reset your password",
    html: `<p>Click to reset your password:</p><p><a href="${link}">${link}</a></p><p>Expires in 1 hour. If you did not request this, ignore.</p>`,
  });
}

export async function consumePasswordResetToken(rawToken: string): Promise<{ ok: boolean; userId?: string }> {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt < new Date()) return { ok: false };
  await prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
  return { ok: true, userId: record.userId };
}
