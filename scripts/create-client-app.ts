import { PrismaClient } from "@prisma/client";
import {
  generateClientId,
  generateClientSecret,
  hashClientSecret,
} from "../lib/auth/client-apps";
import {
  validateAppName,
  validateSlug,
  validateRedirectUriString,
} from "../lib/client-apps/validation";

async function main() {
  const args = process.argv.slice(2);
  // expected: --name <name> --slug <slug> --redirect <uri> [--redirect <uri>]
  const opts: { name?: string; slug?: string; redirects: string[] } = { redirects: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--name") opts.name = args[++i];
    else if (a === "--slug") opts.slug = args[++i];
    else if (a === "--redirect") opts.redirects.push(args[++i]);
  }

  if (!opts.name || !opts.slug || opts.redirects.length === 0) {
    console.error(
      'Usage: npm run create-client-app -- --name "Name" --slug name --redirect http://localhost:3001/callback [--redirect ...]',
    );
    process.exit(1);
  }

  const nameErr = validateAppName(opts.name);
  if (nameErr) return fail(nameErr);
  const slugErr = validateSlug(opts.slug);
  if (slugErr) return fail(slugErr);
  const cleanRedirects: string[] = [];
  for (const r of opts.redirects) {
    const v = validateRedirectUriString(r);
    if (!v.ok) return fail(`Redirect "${r}": ${v.error}`);
    cleanRedirects.push(v.uri);
  }

  const clientId = generateClientId();
  const clientSecret = generateClientSecret();
  const prisma = new PrismaClient();
  try {
    const app = await prisma.clientApp.create({
      data: {
        name: opts.name.trim(),
        slug: opts.slug.trim(),
        clientId,
        clientSecretHash: hashClientSecret(clientSecret),
        redirectUris: {
          create: cleanRedirects.map((uri) => ({ uri })),
        },
      },
      include: { redirectUris: true },
    });

    console.log("Created client app:");
    console.log("  name:         ", app.name);
    console.log("  slug:         ", app.slug);
    console.log("  client_id:    ", app.clientId);
    console.log("  client_secret:", clientSecret, "  <-- copy now, will not be shown again");
    console.log("  redirect_uris:");
    for (const r of app.redirectUris) console.log("    -", r.uri);
  } finally {
    await prisma.$disconnect();
  }
}

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
