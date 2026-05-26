import { getCloudflareContext } from "@opennextjs/cloudflare";

// Minimal SigV4 presigned URL generation for Cloudflare R2 (S3-compatible).
// Used for both public photo uploads and private host-document upload/download.

export interface R2Credentials {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
}

/**
 * Reads R2 S3-API credentials from the Cloudflare env (falling back to
 * process.env for local dev). Returns null when uploads are not configured.
 */
export async function getR2Credentials(): Promise<R2Credentials | null> {
  const { env } = await getCloudflareContext({ async: true });
  const cfEnv = env as unknown as {
    R2_ACCOUNT_ID?: string;
    R2_ACCESS_KEY_ID?: string;
    R2_SECRET_ACCESS_KEY?: string;
  };
  const accountId = cfEnv.R2_ACCOUNT_ID ?? process.env.R2_ACCOUNT_ID;
  const accessKeyId = cfEnv.R2_ACCESS_KEY_ID ?? process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = cfEnv.R2_SECRET_ACCESS_KEY ?? process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) return null;
  return { accountId, accessKeyId, secretAccessKey };
}

export async function generatePresignedPut(opts: {
  creds: R2Credentials;
  bucket: string;
  key: string;
  contentType: string;
  expiresIn: number;
}): Promise<string> {
  const { creds, bucket, key, contentType, expiresIn } = opts;
  return sign({
    creds,
    method: "PUT",
    bucket,
    key,
    expiresIn,
    extraSignedHeaders: { "content-type": contentType },
  });
}

export async function generatePresignedGet(opts: {
  creds: R2Credentials;
  bucket: string;
  key: string;
  expiresIn: number;
}): Promise<string> {
  const { creds, bucket, key, expiresIn } = opts;
  return sign({ creds, method: "GET", bucket, key, expiresIn, extraSignedHeaders: {} });
}

async function sign(opts: {
  creds: R2Credentials;
  method: "GET" | "PUT";
  bucket: string;
  key: string;
  expiresIn: number;
  extraSignedHeaders: Record<string, string>;
}): Promise<string> {
  const { creds, method, bucket, key, expiresIn, extraSignedHeaders } = opts;
  const { accountId, accessKeyId, secretAccessKey } = creds;
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  const region = "auto";
  const service = "s3";
  const host = `${accountId}.r2.cloudflarestorage.com`;

  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const datetime = now.toISOString().replace(/[:-]/g, "").slice(0, 15) + "Z";

  const credentialScope = `${date}/${region}/${service}/aws4_request`;
  const credential = `${accessKeyId}/${credentialScope}`;

  // host is always signed; merge any extra headers (e.g. content-type for PUT)
  const headerEntries = Object.entries({ host, ...extraSignedHeaders }).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  );
  const signedHeaders = headerEntries.map(([k]) => k).join(";");
  const canonicalHeaders = headerEntries.map(([k, v]) => `${k}:${v}\n`).join("");

  const queryParams = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": credential,
    "X-Amz-Date": datetime,
    "X-Amz-Expires": String(expiresIn),
    "X-Amz-SignedHeaders": signedHeaders,
  });

  const canonicalUri = `/${bucket}/${key}`;
  const canonicalRequest = [
    method,
    canonicalUri,
    queryParams.toString(),
    canonicalHeaders,
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    datetime,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = await getSigningKey(secretAccessKey, date, region, service);
  const signature = await hmacHex(signingKey, stringToSign);

  queryParams.set("X-Amz-Signature", signature);
  return `${endpoint}/${bucket}/${key}?${queryParams.toString()}`;
}

async function sha256Hex(data: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data) as Uint8Array<ArrayBuffer>);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacRaw(key: BufferSource | CryptoKey, data: string): Promise<ArrayBuffer> {
  const cryptoKey =
    key instanceof CryptoKey
      ? key
      : await crypto.subtle.importKey("raw", key as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data) as Uint8Array<ArrayBuffer>);
}

async function hmacHex(key: ArrayBuffer, data: string): Promise<string> {
  const buf = await hmacRaw(key, data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getSigningKey(secret: string, date: string, region: string, service: string): Promise<ArrayBuffer> {
  const kDate = await hmacRaw(new TextEncoder().encode(`AWS4${secret}`) as Uint8Array<ArrayBuffer>, date);
  const kRegion = await hmacRaw(kDate, region);
  const kService = await hmacRaw(kRegion, service);
  return hmacRaw(kService, "aws4_request");
}
