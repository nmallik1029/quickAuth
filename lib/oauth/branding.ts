import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { POST_LOGIN_COOKIE } from "./post-login";

export type LoginBranding = {
  name: string;
  logoUrl: string | null;
  brandColor: string | null;
  bgColor: string | null;
  bgImageUrl: string | null;
  selfService: boolean;
  contactEmail: string | null;
};

/**
 * Branding for the client app that initiated the current login. Prefers the return
 * path passed by the login page (?next=), falling back to the legacy post-login
 * cookie. Returns null for direct logins or clients without branding, so the
 * default QuickAuth look is used.
 */
export async function getLoginBranding(next?: string | null): Promise<LoginBranding | null> {
  let path = next ?? null;
  if (!path) {
    const jar = await cookies();
    path = jar.get(POST_LOGIN_COOKIE)?.value ?? null;
  }
  if (!path) return null;

  let clientId: string | null = null;
  try {
    clientId = new URL(path, "http://local").searchParams.get("client_id");
  } catch {
    return null;
  }
  if (!clientId) return null;

  const app = await prisma.clientApp.findUnique({ where: { clientId } });
  if (!app) return null;
  // Only return config if the client customized something.
  if (
    !app.logoUrl &&
    !app.brandColor &&
    !app.bgColor &&
    !app.bgImageUrl &&
    !app.contactEmail &&
    app.selfService
  ) {
    return null;
  }

  return {
    name: app.name,
    logoUrl: app.logoUrl,
    brandColor: app.brandColor,
    bgColor: app.bgColor,
    bgImageUrl: app.bgImageUrl,
    selfService: app.selfService,
    contactEmail: app.contactEmail,
  };
}
