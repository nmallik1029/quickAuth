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
import { createAuditLog } from "@/lib/audit";
import { checkMany, checkRateLimit, getIpKey, LIMITS } from "@/lib/rate-limit";
import { consumePostLoginRedirect } from "@/lib/oauth/post-login";

export type AuthState = { error?: string };

const TOO_MANY = "Too many attempts. Please try again later.";

async function getReqMeta() {
  const h = await headers();
  return {
    userAgent: h.get("user-agent") ?? null,
    ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  };
}

/** Step 1: user enters email, we send a 6-digit code. */
export async function startEmailSignupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const ip = await getIpKey();
  const rl = await checkRateLimit({ key: `signup:ip:${ip}`, ...LIMITS.signup });
  if (!rl.allowed) return { error: TOO_MANY };

  const emailRaw = String(formData.get("email") ?? "");
  if (!isValidEmail(emailRaw)) return { error: "Invalid email." };
  const emailNormalized = normalizeEmail(emailRaw);

  const existing = await prisma.user.findUnique({ where: { emailNormalized } });
  if (existing) return { error: "An account with this email already exists. Try logging in." };

  await startSignupVerification(emailRaw.trim(), emailNormalized);
  await createAuditLog({ action: "email.verification.sent", metadata: { stage: "signup" } });
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
  if (!res.ok) {
    await createAuditLog({ action: "email.verification.failure", metadata: { stage: "signup" } });
    return { ok: false, error: "Invalid or expired code." };
  }
  await createAuditLog({ action: "email.verification.success", metadata: { stage: "signup" } });
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
  await createAuditLog({ action: "signup.success", actorUserId: user.id, targetUserId: user.id, metadata: { method: "password" } });

  const meta = await getReqMeta();
  const token = await createSession(user.id, meta);
  await setSessionCookie(token);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const postLogin = await consumePostLoginRedirect();
  redirect(postLogin ?? redirectTo);
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const ip = await getIpKey();
  const identifierRaw = String(formData.get("identifier") ?? formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const redirectTo = safeRedirectPath(String(formData.get("redirectTo") ?? "/dashboard"));

  const generic = { error: "Invalid username, email, or password." };
  if (!identifierRaw.trim() || !isValidPassword(password)) return generic;

  const isEmail = identifierRaw.includes("@");
  const normalizedKey = isEmail ? normalizeEmail(identifierRaw) : normalizeUsername(identifierRaw);

  const rl = await checkMany([
    { key: `login:ip:${ip}`, ...LIMITS.login },
    { key: `login:id:${normalizedKey}`, ...LIMITS.login },
  ]);
  if (!rl.allowed) return { error: TOO_MANY };

  let user = null;
  if (isEmail) {
    if (!isValidEmail(identifierRaw)) {
      await createAuditLog({ action: "login.failure", metadata: { method: "password", reason: "invalid_email" } });
      return generic;
    }
    user = await prisma.user.findUnique({ where: { emailNormalized: normalizedKey } });
  } else {
    if (!normalizedKey) return generic;
    const profile = await prisma.profile.findUnique({
      where: { usernameNormalized: normalizedKey },
      include: { user: true },
    });
    user = profile?.user ?? null;
  }
  if (!user || user.disabledAt || !user.passwordHash) {
    await createAuditLog({
      action: "login.failure",
      targetUserId: user?.id ?? null,
      metadata: { method: "password", reason: !user ? "no_user" : user.disabledAt ? "disabled" : "no_password" },
    });
    return generic;
  }

  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) {
    await createAuditLog({ action: "login.failure", targetUserId: user.id, metadata: { method: "password", reason: "bad_password" } });
    return generic;
  }

  const meta = await getReqMeta();
  const token = await createSession(user.id, meta);
  await setSessionCookie(token);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createAuditLog({ action: "login.success", actorUserId: user.id, targetUserId: user.id, metadata: { method: "password" } });

  const postLogin = await consumePostLoginRedirect();
  redirect(postLogin ?? redirectTo);
}

export async function logoutAction() {
  const token = await readSessionCookie();
  let userId: string | null = null;
  if (token) {
    const session = await getSessionByToken(token);
    userId = session?.user.id ?? null;
    await revokeSessionByToken(token);
  }
  await clearSessionCookie();
  await createAuditLog({ action: "logout.success", actorUserId: userId, targetUserId: userId });
  redirect("/login");
}

export type MessageState = { error?: string; message?: string };

export async function resendVerificationAction(_prev: MessageState, _formData: FormData): Promise<MessageState> {
  const ip = await getIpKey();
  const token = await readSessionCookie();
  if (!token) return { error: "Not signed in." };
  const session = await getSessionByToken(token);
  if (!session) return { error: "Not signed in." };
  if (session.user.emailVerifiedAt) return { message: "Email already verified." };

  const rl = await checkMany([
    { key: `verification-resend:ip:${ip}`, ...LIMITS.verificationResend },
    { key: `verification-resend:user:${session.user.id}`, ...LIMITS.verificationResend },
  ]);
  if (!rl.allowed) return { error: TOO_MANY };

  await createAndSendVerification(session.user.id, session.user.email);
  await createAuditLog({
    action: "verification.email.resent",
    actorUserId: session.user.id,
    targetUserId: session.user.id,
  });
  return { message: "Verification email sent." };
}

export async function verifyEmailAction(rawToken: string): Promise<{ ok: boolean }> {
  if (!rawToken) return { ok: false };
  const res = await consumeVerificationToken(rawToken);
  await createAuditLog({
    action: res.ok ? "email.verification.success" : "email.verification.failure",
    targetUserId: res.userId ?? null,
  });
  return { ok: res.ok };
}

export async function forgotPasswordAction(_prev: MessageState, formData: FormData): Promise<MessageState> {
  const ip = await getIpKey();
  const emailRaw = String(formData.get("email") ?? "");
  const generic = { message: "If an account exists, a reset code has been sent." };
  if (!isValidEmail(emailRaw)) return generic;
  const emailNormalized = normalizeEmail(emailRaw);

  const rl = await checkMany([
    { key: `password-reset:ip:${ip}`, ...LIMITS.passwordReset },
    { key: `password-reset:email:${emailNormalized}`, ...LIMITS.passwordReset },
  ]);
  if (!rl.allowed) return { error: TOO_MANY };

  const user = await prisma.user.findUnique({ where: { emailNormalized } });
  if (user && !user.disabledAt) {
    await createAndSendPasswordReset(user.id, user.email);
    await createAuditLog({ action: "password.reset.requested", targetUserId: user.id });
  } else {
    await createAuditLog({ action: "password.reset.requested", metadata: { exists: false } });
  }
  redirect(`/reset-password?email=${encodeURIComponent(emailNormalized)}`);
}

export async function forgotUsernameAction(_prev: MessageState, formData: FormData): Promise<MessageState> {
  const ip = await getIpKey();
  const emailRaw = String(formData.get("email") ?? "");
  const generic = { message: "If an account exists, we sent the username to that email." };
  if (!isValidEmail(emailRaw)) return generic;
  const emailNormalized = normalizeEmail(emailRaw);

  const rl = await checkMany([
    { key: `username-reminder:ip:${ip}`, ...LIMITS.usernameReminder },
    { key: `username-reminder:email:${emailNormalized}`, ...LIMITS.usernameReminder },
  ]);
  if (!rl.allowed) return { error: TOO_MANY };

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
    await createAuditLog({ action: "username.reminder.requested", targetUserId: user.id });
  } else {
    await createAuditLog({ action: "username.reminder.requested", metadata: { exists: false } });
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
  await createAuditLog({ action: "password.reset.completed", targetUserId: result.userId });
  redirect("/login?reset=success");
}
