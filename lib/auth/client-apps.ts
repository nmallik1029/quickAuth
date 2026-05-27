import { randomBytes, createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";

const SECRET_PEPPER = process.env.CLIENT_SECRET_PEPPER ?? "qa-default-pepper-change-me";

export function generateClientId(): string {
  return `qa_client_${randomBytes(12).toString("base64url")}`;
}

export function generateClientSecret(): string {
  return `qa_secret_${randomBytes(32).toString("base64url")}`;
}

export function hashClientSecret(secret: string): string {
  return createHmac("sha256", SECRET_PEPPER).update(secret).digest("hex");
}

export function verifyClientSecretHash(rawSecret: string, expectedHash: string): boolean {
  const computed = Buffer.from(hashClientSecret(rawSecret), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  if (computed.length !== expected.length) return false;
  return timingSafeEqual(computed, expected);
}

export async function getClientAppByClientId(clientId: string) {
  return prisma.clientApp.findUnique({
    where: { clientId },
    include: { redirectUris: true },
  });
}

export async function verifyClientAppSecret(clientId: string, rawSecret: string): Promise<boolean> {
  const app = await prisma.clientApp.findUnique({ where: { clientId } });
  if (!app || !app.isActive) return false;
  return verifyClientSecretHash(rawSecret, app.clientSecretHash);
}

export async function validateRedirectUri(clientId: string, redirectUri: string): Promise<boolean> {
  const app = await prisma.clientApp.findUnique({
    where: { clientId },
    include: { redirectUris: true },
  });
  if (!app || !app.isActive) return false;
  return app.redirectUris.some((r) => r.uri === redirectUri);
}
