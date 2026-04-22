import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let _client: S3Client | null = null;

function env() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const publicBase = process.env.R2_PUBLIC_BASE_URL;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBase) {
    throw new Error("R2 env vars missing");
  }
  return { accountId, accessKeyId, secretAccessKey, bucket, publicBase: publicBase.replace(/\/$/, "") };
}

function client() {
  if (_client) return _client;
  const { accountId, accessKeyId, secretAccessKey } = env();
  _client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return _client;
}

export async function presignUpload(key: string, contentType: string) {
  const { bucket } = env();
  const cmd = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
  return getSignedUrl(client(), cmd, { expiresIn: 300 });
}

export function publicUrl(key: string) {
  if (/^https?:\/\//i.test(key)) return key;
  return `${env().publicBase}/${key}`;
}
