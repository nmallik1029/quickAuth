// Easy to extend. Keep lowercase, normalized form only.
const BANNED_USERNAMES: ReadonlySet<string> = new Set([
  "admin",
  "administrator",
  "root",
  "support",
  "moderator",
  "mod",
  "staff",
  "system",
  "official",
  "owner",
  "quickauth",
  "null",
  "undefined",
  "fuck",
  "shit",
  "bitch",
  "ass",
  "cunt",
  "nigger",
  "nigga",
  "faggot",
  "retard",
]);

const MIN_LEN = 3;
const MAX_LEN = 32;

/** Trim + collapse internal whitespace; this is what we display/persist. */
export function cleanUsername(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

/** Normalized lookup value: lowercased clean form. */
export function normalizeUsername(input: string): string {
  return cleanUsername(input).toLowerCase();
}

/** Aggressive normalization used only for banned-word checks (bypass prevention). */
function bannedCheckForm(input: string): string {
  let s = input.toLowerCase();
  s = s.replace(/[\s._\-+*~`'"!?,/\\|()[\]{}<>:;@#$%^&=]/g, "");
  const leet: Record<string, string> = {
    "0": "o",
    "1": "i",
    "3": "e",
    "4": "a",
    "5": "s",
    "7": "t",
  };
  s = s.replace(/[01345 7]/g, (c) => leet[c] ?? c);
  return s;
}

export function containsBannedUsernameTerm(input: string): boolean {
  const form = bannedCheckForm(input);
  if (!form) return false;
  if (BANNED_USERNAMES.has(form)) return true;
  for (const term of BANNED_USERNAMES) {
    if (form.includes(term)) return true;
  }
  return false;
}

export type UsernameValidation =
  | { ok: true; clean: string; normalized: string }
  | { ok: false; error: string };

export function validateUsername(input: string): UsernameValidation {
  const clean = cleanUsername(input);
  if (clean.length === 0) return { ok: false, error: "Username is required." };
  if (clean.length < MIN_LEN) return { ok: false, error: `Username must be at least ${MIN_LEN} characters.` };
  if (clean.length > MAX_LEN) return { ok: false, error: `Username must be ${MAX_LEN} characters or fewer.` };
  const normalized = normalizeUsername(clean);
  if (containsBannedUsernameTerm(normalized)) return { ok: false, error: "That username is not allowed." };
  return { ok: true, clean, normalized };
}
