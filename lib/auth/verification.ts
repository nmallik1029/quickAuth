import { randomInt } from "crypto";
import { prisma } from "@/lib/db";
import { generateToken, hashToken } from "./tokens";
import { sendEmail, appUrl } from "@/lib/email";

const VERIFY_TTL_MS = 1000 * 60 * 60 * 24;
const RESET_TTL_MS = 1000 * 60 * 10;

function generateSixDigitCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

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
  // Invalidate any prior active codes for this user.
  await prisma.passwordResetToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });

  const code = generateSixDigitCode();
  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hashToken(code),
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    },
  });

  await sendEmail({
    to: email,
    subject: "Reset Your Password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #111827;">
      <div style="border: 1px solid #e5e7eb; border-radius: 16px; padding: 32px; background: #ffffff;">
        <h1 style="font-size: 24px; line-height: 32px; margin: 0 0 16px; text-align: center; color: #111827;">
          Reset your password
        </h1>

        <p style="font-size: 15px; line-height: 24px; margin: 0 0 20px; color: #374151;">
          We received a request to reset the password for your account. Use the code below to continue.
        </p>

        <div style="margin: 28px 0; text-align: center;">
          <div style="display: inline-block; font-size: 32px; line-height: 40px; letter-spacing: 8px; font-weight: 700; color: #111827; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px 22px;">
            ${code}
          </div>
        </div>

        <p style="font-size: 15px; line-height: 24px; margin: 0 0 20px; color: #374151;">
          This code expires in <strong>10 minutes</strong>. Enter it on the password reset page to choose a new password.
        </p>

        <p style="font-size: 14px; line-height: 22px; margin: 0; color: #6b7280;">
          If you did not request this, you can safely ignore this email. Your password will not be changed.
        </p>
      </div>

      <p style="font-size: 12px; line-height: 20px; margin: 24px 0 0; text-align: center; color: #9ca3af;">
        © 2026 QuickAuth. All rights reserved.
      </p>
    </div>
    `,
  });
}

export async function verifyPasswordResetCode(
  emailNormalized: string,
  code: string,
): Promise<{ ok: boolean; userId?: string }> {
  if (!/^\d{6}$/.test(code)) return { ok: false };
  const user = await prisma.user.findUnique({ where: { emailNormalized } });
  if (!user || user.disabledAt) return { ok: false };
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(code) } });
  if (!record) return { ok: false };
  if (record.userId !== user.id) return { ok: false };
  if (record.usedAt) return { ok: false };
  if (record.expiresAt < new Date()) return { ok: false };
  return { ok: true, userId: user.id };
}

export async function consumePasswordResetCode(
  emailNormalized: string,
  code: string,
): Promise<{ ok: boolean; userId?: string }> {
  const verified = await verifyPasswordResetCode(emailNormalized, code);
  if (!verified.ok || !verified.userId) return { ok: false };
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(code) } });
  if (!record || record.usedAt) return { ok: false };
  await prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
  return { ok: true, userId: verified.userId };
}
