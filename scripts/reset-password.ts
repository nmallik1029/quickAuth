/**
 * Admin-initiated password reset for a quickAuth account.
 *
 * Sets a new password for a user (generates a temp one if you don't supply it),
 * forces a change-on-next-login when it's a temp, and signs them out everywhere so
 * the old password/session can't be used.
 *
 * Usage:
 *   npm run reset-password -- <email> ["NewPassword"]
 *
 * Targets whatever DATABASE_URL is in scope (.env by default). For the deployed
 * instance, run it with the production quickAuth DATABASE_URL set.
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth/password";

// Random password satisfying quickAuth strength (upper, lower, digit, 8+).
function tempPassword(): string {
  const rnd = crypto.randomBytes(9).toString("base64").replace(/[^a-zA-Z0-9]/g, "");
  return `Aa1${rnd}${crypto.randomInt(10, 99)}`;
}

async function main() {
  const email = process.argv[2];
  const explicit = process.argv[3]; // optional: set this exact password
  if (!email) {
    console.error('Usage: npm run reset-password -- <email> ["NewPassword"]');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const emailNormalized = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { emailNormalized } });
    if (!user) {
      console.error(`No quickAuth user found with email "${email}".`);
      process.exit(1);
    }

    const password = explicit || tempPassword();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(password),
        // If we generated a temp, prompt them to change it; if you set an explicit
        // one, assume it's final.
        mustChangePassword: !explicit,
      },
    });

    // Sign out everywhere so the old password/session is dead.
    const revoked = await prisma.session.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    console.log(
      `\n✅ Password reset for ${user.email}.\n` +
        `   NEW PASSWORD: ${password}\n` +
        (explicit ? "" : "   (They should change it after signing in.)\n") +
        `   Signed out ${revoked.count} active session(s).`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
