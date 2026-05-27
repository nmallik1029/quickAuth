import { headers } from "next/headers";
import { prisma } from "./db";

type AuditMeta = { ipAddress: string | null; userAgent: string | null };

export async function getRequestMeta(): Promise<AuditMeta> {
  try {
    const h = await headers();
    return {
      userAgent: h.get("user-agent") ?? null,
      ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    };
  } catch {
    return { userAgent: null, ipAddress: null };
  }
}

type CreateInput = {
  action: string;
  actorUserId?: string | null;
  targetUserId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

/** Best-effort. Never throws. */
export async function createAuditLog(input: CreateInput): Promise<void> {
  try {
    const reqMeta = await getRequestMeta();
    await prisma.auditLog.create({
      data: {
        action: input.action,
        actorUserId: input.actorUserId ?? null,
        targetUserId: input.targetUserId ?? null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        ipAddress: input.ipAddress ?? reqMeta.ipAddress,
        userAgent: input.userAgent ?? reqMeta.userAgent,
      },
    });
  } catch {
    /* never throw */
  }
}

export async function getRecentAuditLogs(limit = 100) {
  return prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: limit });
}
