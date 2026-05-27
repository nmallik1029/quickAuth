import { NextRequest, NextResponse } from "next/server";
import { POST_LOGIN_COOKIE } from "@/lib/oauth/post-login";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const next = url.searchParams.get("next") ?? "";
  const safe = next.startsWith("/oauth/") ? next : null;

  const res = NextResponse.redirect(new URL("/login", APP_URL));
  if (safe) {
    res.cookies.set(POST_LOGIN_COOKIE, safe, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10,
    });
  }
  return res;
}
