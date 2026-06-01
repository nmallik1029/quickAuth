import { PrismaClient } from "@prisma/client";

// Usage:
//   npx tsx scripts/set-client-branding.ts --slug clinicscreen \
//     --brandColor "#2563eb" --bgColor "#0b1e3b" [--logoUrl https://...] [--bgImageUrl https://...]
const prisma = new PrismaClient();

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const slug = arg("slug");
  if (!slug) {
    console.error("Usage: --slug <slug> [--brandColor #hex] [--bgColor #hex] [--logoUrl url] [--bgImageUrl url]");
    process.exit(1);
  }
  const data: Record<string, string | null | boolean> = {};
  for (const f of ["brandColor", "bgColor", "logoUrl", "bgImageUrl", "contactEmail"]) {
    const v = arg(f);
    if (v !== undefined) data[f] = v === "" ? null : v;
  }
  const selfService = arg("selfService");
  if (selfService !== undefined) data.selfService = selfService === "true";

  const app = await prisma.clientApp.update({ where: { slug }, data });
  console.log("Updated branding for", app.name, "(", app.slug, "):", JSON.stringify(data));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
