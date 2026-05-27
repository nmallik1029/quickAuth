"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, revokeSessionByToken, revokeAllUserSessions, getSessionByToken } from "@/lib/auth/session";
import { setSessionCookie, clearSessionCookie, readSessionCookie } from "@/lib/auth/cookies";
import { isValidEmail, isValidPassword, isStrongPassword, normalizeEmail, safeRedirectPath } from "@/lib/validation";
import { validateUsername, normalizeUsername } from "@/lib/auth/username";
import {
  createAndSendVerification,
  createAndSendPasswordReset,
  consumeVerificationToken,
  verifyPasswordResetCode,
  consumePasswordResetCode,
} from "@/lib/auth/verification";
import { sendEmail } from "@/lib/email";
import {
  startSignupVerification,
  verifySignupCode,
  checkSignupVerified,
  deleteSignupVerification,
} from "@/lib/auth/signup-verification";

export type AuthState = { error?: string };

async function getReqMeta() {
  const h = await headers();
  return {
    userAgent: h.get("user-agent") ?? null,
    ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  };
}

/** Step 1: user enters email, we send a 6-digit code. */
export async function startEmailSignupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const emailRaw = String(formData.get("email") ?? "");
  if (!isValidEmail(emailRaw)) return { error: "Invalid email." };
  const emailNormalized = normalizeEmail(emailRaw);

  const existing = await prisma.user.findUnique({ where: { emailNormalized } });
  if (existing) return { error: "An account with this email already exists. Try logging in." };

  await startSignupVerification(emailRaw.trim(), emailNormalized);
  return {};
}

/** Step 2: user enters the 6-digit code; we mark the verification verified. */
export async function verifySignupEmailAction(
  email: string,
  code: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!isValidEmail(email)) return { ok: false, error: "Invalid or expired code." };
  const emailNormalized = normalizeEmail(email);
  const res = await verifySignupCode(emailNormalized, code);
  if (!res.ok) return { ok: false, error: "Invalid or expired code." };
  return { ok: true };
}

/** Step 3: user picks username + password; verification must already be marked verified. */
export async function completeEmailSignupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const emailRaw = String(formData.get("email") ?? "");
  const code = String(formData.get("code") ?? "");
  const usernameRaw = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const redirectTo = safeRedirectPath(String(formData.get("redirectTo") ?? "/dashboard"));

  if (!isValidEmail(emailRaw)) return { error: "Invalid email." };
  const usernameCheck = validateUsername(usernameRaw);
  if (!usernameCheck.ok) return { error: usernameCheck.error };
  if (!isStrongPassword(password)) {
    return { error: "Password must be 8+ chars with upper, lower, and a number." };
  }

  const emailNormalized = normalizeEmail(emailRaw);

  const existing = await prisma.user.findUnique({ where: { emailNormalized } });
  if (existing) return { error: "An account with this email already exists." };

  const verified = await checkSignupVerified(emailNormalized, code);
  if (!verified.ok) return { error: "Email is not verified. Please restart signup." };

  const usernameTaken = await prisma.profile.findUnique({
    where: { usernameNormalized: usernameCheck.normalized },
  });
  if (usernameTaken) return { error: "That username is already taken." };

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email: verified.email ?? emailRaw.trim(),
      emailNormalized,
      passwordHash,
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          username: usernameCheck.clean,
          usernameNormalized: usernameCheck.normalized,
        },
      },
    },
  });

  await deleteSignupVerification(emailNormalized);

  const meta = await getReqMeta();
  const token = await createSession(user.id, meta);
  await setSessionCookie(token);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  redirect(redirectTo);
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const identifierRaw = String(formData.get("identifier") ?? formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const redirectTo = safeRedirectPath(String(formData.get("redirectTo") ?? "/dashboard"));

  const generic = { error: "Invalid username, email, or password." };
  if (!identifierRaw.trim() || !isValidPassword(password)) return generic;

  const isEmail = identifierRaw.includes("@");
  let user = null;
  if (isEmail) {
    if (!isValidEmail(identifierRaw)) return generic;
    const emailNormalized = normalizeEmail(identifierRaw);
    user = await prisma.user.findUnique({ where: { emailNormalized } });
  } else {
    const usernameNormalized = normalizeUsername(identifierRaw);
    if (!usernameNormalized) return generic;
    const profile = await prisma.profile.findUnique({
      where: { usernameNormalized },
      include: { user: true },
    });
    user = profile?.user ?? null;
  }
  if (!user) return generic;
  if (user.disabledAt) return generic;
  if (!user.passwordHash) return generic;

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

export type MessageState = { error?: string; message?: string };

export async function resendVerificationAction(_prev: MessageState, _formData: FormData): Promise<MessageState> {
  const token = await readSessionCookie();
  if (!token) return { error: "Not signed in." };
  const session = await getSessionByToken(token);
  if (!session) return { error: "Not signed in." };
  if (session.user.emailVerifiedAt) return { message: "Email already verified." };
  await createAndSendVerification(session.user.id, session.user.email);
  return { message: "Verification email sent." };
}

export async function verifyEmailAction(rawToken: string): Promise<{ ok: boolean }> {
  if (!rawToken) return { ok: false };
  const res = await consumeVerificationToken(rawToken);
  return { ok: res.ok };
}

export async function forgotPasswordAction(_prev: MessageState, formData: FormData): Promise<MessageState> {
  const emailRaw = String(formData.get("email") ?? "");
  if (!isValidEmail(emailRaw)) {
    return { message: "If an account exists, a reset code has been sent." };
  }
  const emailNormalized = normalizeEmail(emailRaw);
  const user = await prisma.user.findUnique({ where: { emailNormalized } });
  if (user && !user.disabledAt) {
    await createAndSendPasswordReset(user.id, user.email);
  }
  redirect(`/reset-password?email=${encodeURIComponent(emailNormalized)}`);
}

export async function forgotUsernameAction(_prev: MessageState, formData: FormData): Promise<MessageState> {
  const emailRaw = String(formData.get("email") ?? "");
  const generic = { message: "If an account exists, we sent the username to that email." };
  if (!isValidEmail(emailRaw)) return generic;
  const emailNormalized = normalizeEmail(emailRaw);
  const user = await prisma.user.findUnique({
    where: { emailNormalized },
    include: { profile: true },
  });
  if (user && !user.disabledAt && user.profile?.username) {
    const username = user.profile.username;
    await sendEmail({
      to: user.email,
      subject: "Your QuickAuth username",
      html: `<p>Your username is: <strong>${username}</strong></p><p>If you did not request this, you can safely ignore this email.</p>`,
      text: `Your username is: ${username}\n\nIf you did not request this, you can safely ignore this email.`,
    });
  }
  return generic;
}

export async function verifyResetCodeAction(email: string, code: string): Promise<{ ok: boolean; error?: string }> {
  if (!isValidEmail(email)) return { ok: false, error: "Invalid or expired code." };
  const emailNormalized = normalizeEmail(email);
  const result = await verifyPasswordResetCode(emailNormalized, code);
  if (!result.ok) return { ok: false, error: "Invalid or expired code." };
  return { ok: true };
}

export async function resetPasswordAction(_prev: MessageState, formData: FormData): Promise<MessageState> {
  const emailRaw = String(formData.get("email") ?? "");
  const code = String(formData.get("code") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!isValidEmail(emailRaw)) return { error: "Invalid or expired code." };
  if (!/^\d{6}$/.test(code)) return { error: "Invalid or expired code." };
  if (!isStrongPassword(password)) {
    return { error: "Password must be 8+ chars with upper, lower, and a number." };
  }
  if (password !== confirmPassword) return { error: "Passwords do not match." };

  const emailNormalized = normalizeEmail(emailRaw);
  const result = await consumePasswordResetCode(emailNormalized, code);
  if (!result.ok || !result.userId) return { error: "Invalid or expired code." };

  const passwordHash = await hashPassword(password);
  await prisma.user.update({ where: { id: result.userId }, data: { passwordHash } });
  await revokeAllUserSessions(result.userId);
  await clearSessionCookie();
  redirect("/login?reset=success");
}
