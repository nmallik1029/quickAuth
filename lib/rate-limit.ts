import { headers } from "next/headers";
import { prisma } from "@/lib/db";

export type RateLimitInput = { key: string; limit: number; windowMs: number };
export type RateLimitResult = { allowed: boolean; remaining: number; resetAt: Date };

export const LIMITS = {
  login: { limit: 5, windowMs: 10 * 60 * 1000 },
  signup: { limit: 5, windowMs: 60 * 60 * 1000 },
  passwordReset: { limit: 3, windowMs: 15 * 60 * 1000 },
  usernameReminder: { limit: 3, windowMs: 15 * 60 * 1000 },
  verificationResend: { limit: 3, windowMs: 15 * 60 * 1000 },
  avatarUpload: { limit: 10, windowMs: 60 * 60 * 1000 },
  googleOAuth: { limit: 20, windowMs: 10 * 60 * 1000 },
} as const;

export async function checkRateLimit(input: RateLimitInput): Promise<RateLimitResult> {
  const { key, limit, windowMs } = input;
  const now = new Date();

  // Best-effort cleanup; runs ~2% of the time.
  if (Math.random() < 0.02) {
    prisma.rateLimit.deleteMany({ where: { expiresAt: { lt: now } } }).catch(() => {});
  }

  const existing = await prisma.rateLimit.findUnique({ where: { key } });

  if (!existing || existing.expiresAt <= now) {
    const expiresAt = new Date(now.getTime() + windowMs);
    await prisma.rateLimit.upsert({
      where: { key },
      create: { key, count: 1, windowStart: now, expiresAt },
      update: { count: 1, windowStart: now, expiresAt },
    });
    return { allowed: true, remaining: limit - 1, resetAt: expiresAt };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.expiresAt };
  }

  const updated = await prisma.rateLimit.update({
    where: { key },
    data: { count: { increment: 1 } },
  });
  return {
    allowed: true,
    remaining: Math.max(0, limit - updated.count),
    resetAt: existing.expiresAt,
  };
}

/** Pull a best-effort IP key for rate limiting. */
export async function getIpKey(): Promise<string> {
  try {
    const h = await headers();
    const xff = h.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (xff) return xff;
    const real = h.get("x-real-ip");
    if (real) return real;
  } catch {
    /* */
  }
  return "unknown";
}

/** Combine multiple keys; if any are rate limited, return that one's result. */
export async function checkMany(
  checks: { key: string; limit: number; windowMs: number }[],
): Promise<RateLimitResult> {
  let worst: RateLimitResult = {
    allowed: true,
    remaining: Number.MAX_SAFE_INTEGER,
    resetAt: new Date(0),
  };
  for (const c of checks) {
    const r = await checkRateLimit(c);
    if (!r.allowed) return r;
    if (r.remaining < worst.remaining) worst = r;
  }
  return worst;
}
