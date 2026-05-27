const ALLOWED_REDIRECT_PROTOCOLS = new Set(["http:", "https:"]);

export function validateAppName(name: string): string | null {
  const v = name.trim();
  if (v.length < 2) return "Name must be at least 2 characters.";
  if (v.length > 80) return "Name must be 80 characters or fewer.";
  return null;
}

export function validateSlug(slug: string): string | null {
  const v = slug.trim();
  if (!/^[a-z0-9-]+$/.test(v)) return "Slug must be lowercase letters, numbers, and hyphens only.";
  if (v.length < 2) return "Slug must be at least 2 characters.";
  if (v.length > 50) return "Slug must be 50 characters or fewer.";
  return null;
}

export function validateDescription(desc: string | null | undefined): string | null {
  if (!desc) return null;
  if (desc.length > 300) return "Description must be 300 characters or fewer.";
  return null;
}

export function validateHttpUrl(url: string | null | undefined, field: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return `${field} must be http or https.`;
    return null;
  } catch {
    return `${field} must be a valid URL.`;
  }
}

export function validateRedirectUriString(uri: string): { ok: true; uri: string } | { ok: false; error: string } {
  const raw = uri.trim();
  if (!raw) return { ok: false, error: "Redirect URI is required." };
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { ok: false, error: `"${raw}" is not a valid URL.` };
  }
  if (!ALLOWED_REDIRECT_PROTOCOLS.has(u.protocol)) {
    return { ok: false, error: `Redirect URI must use http or https.` };
  }
  if (u.protocol === "http:" && u.hostname !== "localhost" && u.hostname !== "127.0.0.1") {
    return { ok: false, error: "http:// is only allowed for localhost." };
  }
  return { ok: true, uri: u.toString() };
}
