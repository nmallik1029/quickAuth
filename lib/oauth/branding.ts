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
 * Branding for the client app that initiated the current login, derived from the
 * pending post-login redirect cookie. Returns null for direct logins or clients
 * without branding, so the default QuickAuth look is used. Does not consume the
 * cookie (loginAction still needs it).
 */
export async function getLoginBranding(): Promise<LoginBranding | null> {
  const jar = await cookies();
  const path = jar.get(POST_LOGIN_COOKIE)?.value;
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
