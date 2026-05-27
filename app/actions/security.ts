"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/require-user";
import { getCurrentSession } from "@/lib/auth/current-user";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { clearSessionCookie } from "@/lib/auth/cookies";
import { isStrongPassword } from "@/lib/validation";

export type SecurityState = { error?: string; message?: string };

export async function changePasswordAction(_prev: SecurityState, formData: FormData): Promise<SecurityState> {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const user = session.user;

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!isStrongPassword(newPassword)) {
    return { error: "Password must be 8+ chars with upper, lower, and a number." };
  }
  if (newPassword !== confirmPassword) return { error: "Passwords do not match." };

  if (!user.passwordHash) {
    // Set-password path (Google-only account)
    const hash = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });
    revalidatePath("/settings/security");
    return { message: "Password set." };
  }

  const ok = await verifyPassword(user.passwordHash, currentPassword);
  if (!ok) return { error: "Current password is incorrect." };

  const hash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });
  // Revoke other sessions, keep this one.
  await prisma.session.updateMany({
    where: { userId: user.id, revokedAt: null, NOT: { id: session.id } },
    data: { revokedAt: new Date() },
  });

  revalidatePath("/settings/security");
  return { message: "Password changed. Other sessions signed out." };
}

export async function revokeSessionAction(sessionId: string): Promise<{ ok: boolean; error?: string }> {
  const current = await getCurrentSession();
  if (!current) return { ok: false, error: "Not signed in." };
  if (sessionId === current.id) return { ok: false, error: "Use Sign out to end this session." };

  const target = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!target || target.userId !== current.user.id) return { ok: false, error: "Not found." };
  if (target.revokedAt) return { ok: true };

  await prisma.session.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
  revalidatePath("/settings/security");
  return { ok: true };
}

export async function revokeOtherSessionsAction(): Promise<{ ok: boolean }> {
  const current = await getCurrentSession();
  if (!current) return { ok: false };
  await prisma.session.updateMany({
    where: { userId: current.user.id, revokedAt: null, NOT: { id: current.id } },
    data: { revokedAt: new Date() },
  });
  revalidatePath("/settings/security");
  return { ok: true };
}

export async function signOutEverywhereAction(): Promise<void> {
  const user = await requireUser();
  await prisma.session.updateMany({
    where: { userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  await clearSessionCookie();
  redirect("/login");
}
