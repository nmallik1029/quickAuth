"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/require-user";
import { validateUsername } from "@/lib/auth/username";
import { saveAvatar, deleteAvatarFile } from "@/lib/uploads/avatar";

export type ProfileState = { error?: string; message?: string };

const MAX_DISPLAY_NAME = 80;
const MAX_BIO = 240;

export async function updateProfileAction(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();

  const displayNameRaw = String(formData.get("displayName") ?? "").trim();
  const bioRaw = String(formData.get("bio") ?? "").trim();
  const usernameRaw = String(formData.get("username") ?? "");

  if (displayNameRaw.length > MAX_DISPLAY_NAME) {
    return { error: `Display name must be ${MAX_DISPLAY_NAME} characters or fewer.` };
  }
  if (bioRaw.length > MAX_BIO) {
    return { error: `Bio must be ${MAX_BIO} characters or fewer.` };
  }

  const usernameCheck = validateUsername(usernameRaw);
  if (!usernameCheck.ok) return { error: usernameCheck.error };

  const existing = await prisma.profile.findUnique({
    where: { usernameNormalized: usernameCheck.normalized },
    select: { userId: true },
  });
  if (existing && existing.userId !== user.id) {
    return { error: "That username is already taken." };
  }

  await prisma.profile.update({
    where: { userId: user.id },
    data: {
      displayName: displayNameRaw || null,
      bio: bioRaw || null,
      username: usernameCheck.clean,
      usernameNormalized: usernameCheck.normalized,
    },
  });

  revalidatePath("/settings/profile");
  return { message: "Profile saved." };
}

export async function uploadAvatarAction(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const file = formData.get("avatar");
  if (!(file instanceof File)) return { error: "No file provided." };

  const result = await saveAvatar(user.id, file);
  if (!result.ok) return { error: result.error };

  const existing = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { avatarUrl: true },
  });
  await prisma.profile.update({
    where: { userId: user.id },
    data: { avatarUrl: result.url },
  });
  if (existing?.avatarUrl && existing.avatarUrl !== result.url) {
    await deleteAvatarFile(existing.avatarUrl);
  }

  revalidatePath("/settings/profile");
  return { message: "Avatar updated." };
}
