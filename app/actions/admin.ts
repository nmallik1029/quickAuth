"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/require-admin";
import { createAuditLog } from "@/lib/audit";

export async function adminVerifyEmailAction(targetUserId: string): Promise<void> {
  const admin = await requireAdmin();
  await prisma.user.update({
    where: { id: targetUserId },
    data: { emailVerifiedAt: new Date() },
  });
  await createAuditLog({
    action: "admin.user.verified",
    actorUserId: admin.id,
    targetUserId,
  });
  revalidatePath(`/admin/users/${targetUserId}`);
}

export async function adminDisableUserAction(targetUserId: string): Promise<void> {
  const admin = await requireAdmin();
  if (targetUserId === admin.id) return;
  await prisma.user.update({
    where: { id: targetUserId },
    data: { disabledAt: new Date() },
  });
  await prisma.session.updateMany({
    where: { userId: targetUserId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  await createAuditLog({
    action: "admin.user.disabled",
    actorUserId: admin.id,
    targetUserId,
  });
  revalidatePath(`/admin/users/${targetUserId}`);
}

export async function adminEnableUserAction(targetUserId: string): Promise<void> {
  const admin = await requireAdmin();
  await prisma.user.update({
    where: { id: targetUserId },
    data: { disabledAt: null },
  });
  await createAuditLog({
    action: "admin.user.enabled",
    actorUserId: admin.id,
    targetUserId,
  });
  revalidatePath(`/admin/users/${targetUserId}`);
}

export async function adminRevokeSessionsAction(targetUserId: string): Promise<void> {
  const admin = await requireAdmin();
  const result = await prisma.session.updateMany({
    where: { userId: targetUserId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  await createAuditLog({
    action: "admin.sessions.revoked",
    actorUserId: admin.id,
    targetUserId,
    metadata: { count: result.count },
  });
  revalidatePath(`/admin/users/${targetUserId}`);
}

export async function adminSetRoleAction(targetUserId: string, role: "admin" | "user"): Promise<void> {
  const admin = await requireAdmin();
  // Don't allow self-demote
  if (targetUserId === admin.id && role !== "admin") return;
  if (role !== "admin" && role !== "user") return;
  await prisma.user.update({
    where: { id: targetUserId },
    data: { role },
  });
  await createAuditLog({
    action: "admin.role.updated",
    actorUserId: admin.id,
    targetUserId,
    metadata: { role },
  });
  revalidatePath(`/admin/users/${targetUserId}`);
}
