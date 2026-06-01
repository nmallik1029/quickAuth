import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { normalizeEmail } from "@/lib/validation";
import { normalizeUsername } from "@/lib/auth/username";

// Server-to-server user provisioning for trusted client apps (e.g. ClinicScreen
// onboarding). Authenticated by a shared secret. Creates a verified account with
// a temp password that must be changed on first login.
export async function POST(req: Request) {
  const secret = process.env.PROVISION_SECRET;
  if (!secret || req.headers.get("x-provision-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { email?: string; username?: string; password?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim();
  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");
  const name = String(body.name ?? username ?? email);
  if (!email || !username || !password) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const emailNormalized = normalizeEmail(email);
  const usernameNormalized = normalizeUsername(username);

  const existing = await prisma.user.findUnique({ where: { emailNormalized } });
  if (existing) return NextResponse.json({ error: "email_taken" }, { status: 409 });

  try {
    await prisma.user.create({
      data: {
        email,
        emailNormalized,
        passwordHash: await hashPassword(password),
        emailVerifiedAt: new Date(),
        mustChangePassword: true,
        profile: { create: { displayName: name, username, usernameNormalized } },
      },
    });
  } catch {
    return NextResponse.json({ error: "username_taken" }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
