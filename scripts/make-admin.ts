import { PrismaClient } from "@prisma/client";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npm run make-admin -- <email>");
    process.exit(1);
  }
  const prisma = new PrismaClient();
  try {
    const emailNormalized = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { emailNormalized } });
    if (!user) {
      console.error(`No user found with email "${email}".`);
      process.exit(1);
    }
    if (user.role === "admin") {
      console.log(`${user.email} is already an admin.`);
      return;
    }
    await prisma.user.update({ where: { id: user.id }, data: { role: "admin" } });
    console.log(`Promoted ${user.email} to admin.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
