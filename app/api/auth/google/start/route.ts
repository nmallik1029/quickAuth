import { NextRequest, NextResponse } from "next/server";
import { buildGoogleAuthUrl, googleConfig, OAUTH_STATE_COOKIE, randomState } from "@/lib/auth/google";
import { checkRateLimit, getIpKey, LIMITS } from "@/lib/rate-limit";
import { POST_LOGIN_COOKIE } from "@/lib/oauth/post-login";

export async function GET(req: NextRequest) {
  const ip = await getIpKey();
  const rl = await checkRateLimit({ key: `google-oauth:ip:${ip}`, ...LIMITS.googleOAuth });
  if (!rl.allowed) {
    return NextResponse.redirect(
      new URL("/login?error=rate_limited", process.env.APP_URL ?? "http://localhost:3000"),
    );
  }

  const { clientId } = googleConfig();
  if (!clientId) {
    return NextResponse.redirect(
      new URL("/login?error=google_not_configured", process.env.APP_URL ?? "http://localhost:3000"),
    );
  }
  const state = randomState();
  const res = NextResponse.redirect(buildGoogleAuthUrl(state));
  res.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
  // Carry the post-login return path (the OAuth authorize URL) through the Google
  // round trip, since /oauth/begin-login no longer sets it.
  const next = req.nextUrl.searchParams.get("next");
  if (next && next.startsWith("/oauth/")) {
    res.cookies.set(POST_LOGIN_COOKIE, next, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10,
    });
  }
  return res;
}
