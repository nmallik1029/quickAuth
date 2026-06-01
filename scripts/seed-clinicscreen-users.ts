import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth/password";

const prisma = new PrismaClient();

const PASSWORD = "Password123!";
const users = [
  { email: "superadmin@clinicscreen.example", username: "superadmin", displayName: "Platform Admin" },
  { email: "admin@testcardiology.example", username: "cardioadmin", displayName: "Front Desk Admin" },
];

async function main() {
  const passwordHash = await hashPassword(PASSWORD);
  for (const u of users) {
    const emailNormalized = u.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { emailNormalized } });
    if (existing) {
      console.log("exists:", u.email);
      continue;
    }
    await prisma.user.create({
      data: {
        email: u.email,
        emailNormalized,
        passwordHash,
        emailVerifiedAt: new Date(),
        profile: {
          create: {
            displayName: u.displayName,
            username: u.username,
            usernameNormalized: u.username.toLowerCase(),
          },
        },
      },
    });
    console.log("created:", u.email, "(password:", PASSWORD + ")");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
