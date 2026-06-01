import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth/password";

// Usage:
//   npx tsx scripts/create-practice-admin.ts --email a@b.com --username neelmallik --password Temp1234! --name "Neel Mallik"
// Creates (or updates) a verified user with a temp password that must be changed on first login.
const prisma = new PrismaClient();

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg("email");
  const username = arg("username");
  const password = arg("password");
  const name = arg("name") ?? username ?? email ?? "Admin";
  if (!email || !username || !password) {
    console.error('Usage: --email <email> --username <username> --password <tempPassword> [--name "Full Name"]');
    process.exit(1);
  }

  const emailNormalized = email.toLowerCase();
  const usernameNormalized = username.toLowerCase();
  const passwordHash = await hashPassword(password);

  const existing = await prisma.user.findUnique({ where: { emailNormalized } });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash, mustChangePassword: true, emailVerifiedAt: new Date() },
    });
    console.log("Updated existing user (temp password, must change):", email);
  } else {
    await prisma.user.create({
      data: {
        email,
        emailNormalized,
        passwordHash,
        emailVerifiedAt: new Date(),
        mustChangePassword: true,
        profile: { create: { displayName: name, username, usernameNormalized } },
      },
    });
    console.log("Created user:", email, "| username:", username, "| temp password:", password);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
