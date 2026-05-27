import { cookies } from "next/headers";

export const POST_LOGIN_COOKIE = "qa_post_login_redirect";

/** Set the post-login redirect cookie. Only paths starting with /oauth/ are accepted. */
export async function setPostLoginRedirect(path: string): Promise<void> {
  if (!path.startsWith("/oauth/")) return;
  const jar = await cookies();
  jar.set(POST_LOGIN_COOKIE, path, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
}

export async function consumePostLoginRedirect(): Promise<string | null> {
  const jar = await cookies();
  const v = jar.get(POST_LOGIN_COOKIE)?.value;
  if (!v) return null;
  jar.delete(POST_LOGIN_COOKIE);
  if (!v.startsWith("/oauth/")) return null;
  return v;
}
