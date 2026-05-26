"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, revokeSessionByToken } from "@/lib/auth/session";
import { setSessionCookie, clearSessionCookie, readSessionCookie } from "@/lib/auth/cookies";
import { isValidEmail, isValidPassword, normalizeEmail, safeRedirectPath } from "@/lib/validation";

export type AuthState = { error?: string };

async function getReqMeta() {
  const h = await headers();
  return {
    userAgent: h.get("user-agent") ?? null,
    ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  };
}

export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const emailRaw = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const redirectTo = safeRedirectPath(String(formData.get("redirectTo") ?? "/dashboard"));

  if (!isValidEmail(emailRaw)) return { error: "Invalid email." };
  if (!isValidPassword(password)) return { error: "Password must be at least 8 characters." };

  const emailNormalized = normalizeEmail(emailRaw);
  const existing = await prisma.user.findUnique({ where: { emailNormalized } });
  if (existing) return { error: "An account with this email already exists." };

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email: emailRaw.trim(),
      emailNormalized,
      passwordHash,
      profile: { create: {} },
    },
  });

  const meta = await getReqMeta();
  const token = await createSession(user.id, meta);
  await setSessionCookie(token);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  redirect(redirectTo);
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const emailRaw = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const redirectTo = safeRedirectPath(String(formData.get("redirectTo") ?? "/dashboard"));

  const generic = { error: "Invalid email or password." };
  if (!isValidEmail(emailRaw) || !isValidPassword(password)) return generic;

  const emailNormalized = normalizeEmail(emailRaw);
  const user = await prisma.user.findUnique({ where: { emailNormalized } });
  if (!user) return generic;
  if (user.disabledAt) return generic;

  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) return generic;

  const meta = await getReqMeta();
  const token = await createSession(user.id, meta);
  await setSessionCookie(token);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  redirect(redirectTo);
}

export async function logoutAction() {
  const token = await readSessionCookie();
  if (token) await revokeSessionByToken(token);
  await clearSessionCookie();
  redirect("/login");
}
