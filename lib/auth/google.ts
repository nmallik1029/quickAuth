import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { normalizeUsername, containsBannedUsernameTerm } from "./username";

export const OAUTH_STATE_COOKIE = "qa_oauth_state";

export function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ??
    `${(process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/api/auth/google/callback`;
  return { clientId, clientSecret, redirectUri };
}

export function buildGoogleAuthUrl(state: string): string {
  const { clientId, redirectUri } = googleConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    include_granted_scopes: "true",
    prompt: "select_account",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function randomState(): string {
  return randomBytes(24).toString("base64url");
}

export type GoogleProfile = {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  given_name?: string;
  picture?: string;
};

export async function exchangeCodeForProfile(code: string): Promise<GoogleProfile | null> {
  const { clientId, clientSecret, redirectUri } = googleConfig();

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) return null;
  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  const accessToken = tokenJson.access_token;
  if (!accessToken) return null;

  const userRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!userRes.ok) return null;
  const profile = (await userRes.json()) as GoogleProfile;
  if (!profile.sub || !profile.email) return null;
  return profile;
}

/** Generate a unique, allowed username for a new Google user. */
export async function generateUniqueUsernameFromEmail(email: string): Promise<{ clean: string; normalized: string }> {
  const base = email.split("@")[0].toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 24) || "user";
  const candidates: string[] = [base];
  for (let i = 0; i < 12; i++) {
    const suffix = randomBytes(3).toString("hex");
    candidates.push(`${base.slice(0, 20)}_${suffix}`);
  }
  for (const c of candidates) {
    if (!c || c.length < 3) continue;
    const normalized = normalizeUsername(c);
    if (containsBannedUsernameTerm(normalized)) continue;
    const taken = await prisma.profile.findUnique({ where: { usernameNormalized: normalized } });
    if (!taken) return { clean: c, normalized };
  }
  // Last resort
  const fallback = `user_${randomBytes(4).toString("hex")}`;
  return { clean: fallback, normalized: normalizeUsername(fallback) };
}
