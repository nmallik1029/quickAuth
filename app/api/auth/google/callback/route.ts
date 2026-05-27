import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exchangeCodeForProfile, generateUniqueUsernameFromEmail, OAUTH_STATE_COOKIE } from "@/lib/auth/google";
import { createSession } from "@/lib/auth/session";
import { SESSION_COOKIE } from "@/lib/auth/cookies";
import { normalizeEmail } from "@/lib/validation";
import { createAuditLog } from "@/lib/audit";
import { checkRateLimit, getIpKey, LIMITS } from "@/lib/rate-limit";
import { consumePostLoginRedirect } from "@/lib/oauth/post-login";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

function redirectWith(error: string) {
  return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, APP_URL));
}

export async function GET(req: NextRequest) {
  const ip = await getIpKey();
  const rl = await checkRateLimit({ key: `google-oauth:ip:${ip}`, ...LIMITS.googleOAuth });
  if (!rl.allowed) return redirectWith("rate_limited");

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const stateCookie = req.cookies.get(OAUTH_STATE_COOKIE)?.value;

  if (!code || !state || !stateCookie || state !== stateCookie) {
    await createAuditLog({ action: "google.login.failure", metadata: { reason: "state_invalid" } });
    return redirectWith("google_state_invalid");
  }

  const profile = await exchangeCodeForProfile(code);
  if (!profile) {
    await createAuditLog({ action: "google.login.failure", metadata: { reason: "exchange_failed" } });
    return redirectWith("google_exchange_failed");
  }
  if (!profile.email_verified) {
    await createAuditLog({ action: "google.login.failure", metadata: { reason: "email_unverified" } });
    return redirectWith("google_email_unverified");
  }

  const emailNormalized = normalizeEmail(profile.email);

  // Find by googleId first, fall back to email.
  let user = await prisma.user.findUnique({ where: { googleId: profile.sub } });
  if (!user) {
    user = await prisma.user.findUnique({ where: { emailNormalized } });
    if (user) {
      // Link existing email account to this Google identity.
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: profile.sub,
          emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
        },
      });
    }
  }

  if (!user) {
    // Brand new user: create one with auto-generated username, no password.
    const { clean: username, normalized: usernameNormalized } = await generateUniqueUsernameFromEmail(profile.email);
    user = await prisma.user.create({
      data: {
        email: profile.email,
        emailNormalized,
        googleId: profile.sub,
        emailVerifiedAt: new Date(),
        profile: {
          create: {
            username,
            usernameNormalized,
            displayName: profile.name ?? null,
            avatarUrl: profile.picture ?? null,
          },
        },
      },
    });
  }

  if (user.disabledAt) {
    await createAuditLog({ action: "google.login.failure", targetUserId: user.id, metadata: { reason: "disabled" } });
    return redirectWith("account_disabled");
  }

  const userAgent = req.headers.get("user-agent");
  const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const token = await createSession(user.id, { userAgent, ipAddress });

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const postLogin = await consumePostLoginRedirect();
  const dest = postLogin ?? "/dashboard";
  const res = NextResponse.redirect(new URL(dest, APP_URL));
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  res.cookies.delete(OAUTH_STATE_COOKIE);
  await createAuditLog({
    action: "google.login.success",
    actorUserId: user.id,
    targetUserId: user.id,
  });
  return res;
}
