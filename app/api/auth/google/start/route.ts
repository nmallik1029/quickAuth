import { NextResponse } from "next/server";
import { buildGoogleAuthUrl, googleConfig, OAUTH_STATE_COOKIE, randomState } from "@/lib/auth/google";

export async function GET() {
  const { clientId } = googleConfig();
  if (!clientId) {
    return NextResponse.redirect(new URL("/login?error=google_not_configured", process.env.APP_URL ?? "http://localhost:3000"));
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
  return res;
}
