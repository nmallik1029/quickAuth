import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { normalizeEmail } from "@/lib/validation";

// Server-to-server admin password reset for trusted client apps (ClinicScreen
// superadmin panel). Authenticated by the shared provision secret. Sets a new
// (temp) password, forces a change on next login, and signs the user out
// everywhere so the old password/session can't be used.
export async function POST(req: Request) {
  const secret = process.env.PROVISION_SECRET;
  if (!secret || req.headers.get("x-provision-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { email?: string; password?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");
  if (!email || !password) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { emailNormalized: normalizeEmail(email) } });
  if (!user) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(password), mustChangePassword: true },
  });
  await prisma.session.updateMany({
    where: { userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
