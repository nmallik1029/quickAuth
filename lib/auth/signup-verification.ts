import { randomInt } from "crypto";
import { prisma } from "@/lib/db";
import { hashToken } from "./tokens";
import { sendEmail } from "@/lib/email";

const TTL_MS = 1000 * 60 * 10;

function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export async function startSignupVerification(email: string, emailNormalized: string) {
  const code = generateCode();
  const codeHash = hashToken(code);
  const expiresAt = new Date(Date.now() + TTL_MS);

  await prisma.signupVerification.upsert({
    where: { emailNormalized },
    create: { email, emailNormalized, codeHash, expiresAt, verifiedAt: null },
    update: { email, codeHash, expiresAt, verifiedAt: null },
  });

  await sendEmail({
    to: email,
    subject: "Your QuickAuth signup code",
    html: `
      <p>Your signup verification code is:</p>
      <p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${code}</p>
      <p>This code expires in 10 minutes.</p>
      <p>If you did not request this, you can safely ignore this email.</p>
    `,
    text: `Your signup verification code is:\n\n${code}\n\nThis code expires in 10 minutes. If you did not request this, ignore this email.`,
  });
}

export async function verifySignupCode(emailNormalized: string, code: string): Promise<{ ok: boolean }> {
  if (!/^\d{6}$/.test(code)) return { ok: false };
  const record = await prisma.signupVerification.findUnique({ where: { emailNormalized } });
  if (!record) return { ok: false };
  if (record.expiresAt < new Date()) return { ok: false };
  if (record.codeHash !== hashToken(code)) return { ok: false };
  if (!record.verifiedAt) {
    await prisma.signupVerification.update({
      where: { emailNormalized },
      data: { verifiedAt: new Date() },
    });
  }
  return { ok: true };
}

/** Returns ok only if email+code matched and was verified. Caller deletes record after creating the user. */
export async function checkSignupVerified(
  emailNormalized: string,
  code: string,
): Promise<{ ok: boolean; email?: string }> {
  if (!/^\d{6}$/.test(code)) return { ok: false };
  const record = await prisma.signupVerification.findUnique({ where: { emailNormalized } });
  if (!record) return { ok: false };
  if (record.expiresAt < new Date()) return { ok: false };
  if (record.codeHash !== hashToken(code)) return { ok: false };
  if (!record.verifiedAt) return { ok: false };
  return { ok: true, email: record.email };
}

export async function deleteSignupVerification(emailNormalized: string) {
  await prisma.signupVerification.deleteMany({ where: { emailNormalized } });
}
