import { S3Client } from "@aws-sdk/client-s3";

export function r2Config() {
  const accountId = process.env.R2_ACCOUNT_ID ?? "";
  const accessKeyId = process.env.R2_ACCESS_KEY_ID ?? "";
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY ?? "";
  const bucket = process.env.R2_BUCKET ?? "";
  const publicBaseUrl = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
  return { accountId, accessKeyId, secretAccessKey, bucket, publicBaseUrl };
}

let _client: S3Client | null = null;

export function r2Client(): S3Client {
  if (_client) return _client;
  const { accountId, accessKeyId, secretAccessKey } = r2Config();
  _client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
  return _client;
}

export function r2PublicUrl(key: string): string {
  const { publicBaseUrl } = r2Config();
  return `${publicBaseUrl}/${key.replace(/^\//, "")}`;
}

export function r2KeyFromUrl(url: string): string | null {
  const { publicBaseUrl } = r2Config();
  if (!publicBaseUrl || !url.startsWith(publicBaseUrl + "/")) return null;
  return url.slice(publicBaseUrl.length + 1);
}
