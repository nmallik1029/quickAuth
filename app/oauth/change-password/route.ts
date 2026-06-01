import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/oauth/codes";
import { hashPassword } from "@/lib/auth/password";
import { isStrongPassword } from "@/lib/validation";
import { prisma } from "@/lib/db";

// Token-authenticated password change for OAuth client apps (used by the
// first-login onboarding flow). Clears the mustChangePassword flag.
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }
  const record = await getAccessToken(match[1].trim());
  if (!record) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  let body: { new_password?: string } = {};
  try {
    body = await req.json();
  } catch {
    // ignore
  }
  const newPassword = String(body.new_password ?? "");
  if (!isStrongPassword(newPassword)) {
    return NextResponse.json(
      {
        error: "weak_password",
        error_description:
          "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number.",
      },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: record.user.id },
    data: { passwordHash: await hashPassword(newPassword), mustChangePassword: false },
  });

  return NextResponse.json({ ok: true });
}
