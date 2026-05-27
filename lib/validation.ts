export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export function isValidPassword(password: string): boolean {
  return typeof password === "string" && password.length >= 8 && password.length <= 200;
}

export function isStrongPassword(password: string): boolean {
  if (!isValidPassword(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/\d/.test(password)) return false;
  return true;
}

export function safeRedirectPath(input: string | null | undefined, fallback = "/dashboard"): string {
  if (!input) return fallback;
  if (!input.startsWith("/")) return fallback;
  if (input.startsWith("//") || input.startsWith("/\\")) return fallback;
  return input;
}
