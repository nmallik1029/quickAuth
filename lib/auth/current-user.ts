import { readSessionCookie } from "./cookies";
import { getSessionByToken } from "./session";

export async function getCurrentUser() {
  const token = await readSessionCookie();
  if (!token) return null;
  const session = await getSessionByToken(token);
  if (!session) return null;
  if (session.user.disabledAt) return null;
  return session.user;
}

export async function getCurrentSession() {
  const token = await readSessionCookie();
  if (!token) return null;
  const session = await getSessionByToken(token);
  if (!session) return null;
  if (session.user.disabledAt) return null;
  return session;
}
