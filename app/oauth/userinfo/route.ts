import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/oauth/codes";

function err(error: string, description?: string, status = 401) {
  return NextResponse.json(
    { error, ...(description ? { error_description: description } : {}) },
    { status },
  );
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return err("invalid_token", "Missing bearer token.");
  const raw = match[1].trim();
  if (!raw) return err("invalid_token");

  const record = await getAccessToken(raw);
  if (!record) return err("invalid_token", "Token is invalid, expired, or revoked.");

  const u = record.user;
  return NextResponse.json({
    id: u.id,
    email: u.email,
    email_verified: !!u.emailVerifiedAt,
    username: u.profile?.username ?? null,
    display_name: u.profile?.displayName ?? null,
    avatar_url: u.profile?.avatarUrl ?? null,
    must_change_password: u.mustChangePassword,
  });
}
