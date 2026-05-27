import { randomBytes } from "crypto";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, r2Config, r2KeyFromUrl, r2PublicUrl } from "./r2";

const MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED: { mime: string; ext: string; magic: (b: Buffer) => boolean }[] = [
  { mime: "image/png", ext: "png", magic: (b) => b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { mime: "image/jpeg", ext: "jpg", magic: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/webp", ext: "webp", magic: (b) => b.length >= 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP" },
];

export type AvatarUploadResult =
  | { ok: true; url: string; key: string }
  | { ok: false; error: string };

export async function saveAvatar(userId: string, file: File): Promise<AvatarUploadResult> {
  if (!file || typeof file === "string") return { ok: false, error: "No file provided." };
  if (file.size === 0) return { ok: false, error: "File is empty." };
  if (file.size > MAX_BYTES) return { ok: false, error: "File must be 5MB or smaller." };

  const declaredMime = file.type.toLowerCase();
  const allowedByMime = ALLOWED.find((a) => a.mime === declaredMime);
  if (!allowedByMime) return { ok: false, error: "Only PNG, JPG, or WEBP images are allowed." };

  const buf = Buffer.from(await file.arrayBuffer());
  if (!allowedByMime.magic(buf)) {
    return { ok: false, error: "File content does not match its image type." };
  }

  const { bucket, publicBaseUrl } = r2Config();
  if (!bucket || !publicBaseUrl) return { ok: false, error: "Avatar storage is not configured." };

  const random = randomBytes(16).toString("hex");
  const key = `avatars/${userId}/${random}.${allowedByMime.ext}`;

  await r2Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buf,
      ContentType: allowedByMime.mime,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return { ok: true, url: r2PublicUrl(key), key };
}

export async function deleteAvatarFile(publicUrl: string | null | undefined): Promise<void> {
  if (!publicUrl) return;
  const key = r2KeyFromUrl(publicUrl);
  if (!key) return;
  const { bucket } = r2Config();
  if (!bucket) return;
  try {
    await r2Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch {
    /* ignore */
  }
}
