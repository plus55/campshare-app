import { NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import {
  ALLOWED_CONTENT_TYPES,
  MAX_PHOTO_BYTES,
  MAX_PHOTOS_PER_LISTING,
  photoExtension,
} from "@/lib/photos";

const schema = z.object({
  vanListingId: z.string().min(1),
  contentType: z.enum(ALLOWED_CONTENT_TYPES),
  sizeBytes: z.number().int().positive().max(MAX_PHOTO_BYTES),
});

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return bad("Sign in required", 401);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? "Invalid payload");

  const { vanListingId, contentType, sizeBytes } = parsed.data;

  const listing = await db()
    .prepare("SELECT id FROM van_listing WHERE id = ? AND hostUserId = ?")
    .bind(vanListingId, session.user.id)
    .first<{ id: string }>();
  if (!listing) return bad("Listing not found or not yours", 404);

  const count = await db()
    .prepare("SELECT COUNT(*) AS n FROM van_photo WHERE vanListingId = ?")
    .bind(vanListingId)
    .first<{ n: number }>();
  if ((count?.n ?? 0) >= MAX_PHOTOS_PER_LISTING) {
    return bad(`Maximum ${MAX_PHOTOS_PER_LISTING} photos per listing`);
  }

  const { env } = await getCloudflareContext({ async: true });
  const cfEnv = env as unknown as { R2_ACCOUNT_ID?: string; R2_ACCESS_KEY_ID?: string; R2_SECRET_ACCESS_KEY?: string };
  const accountId = cfEnv.R2_ACCOUNT_ID ?? process.env.R2_ACCOUNT_ID;
  const accessKeyId = cfEnv.R2_ACCESS_KEY_ID ?? process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = cfEnv.R2_SECRET_ACCESS_KEY ?? process.env.R2_SECRET_ACCESS_KEY;
  const bucket = "campshare-photos";

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return bad("Photo uploads are not yet configured. Enable R2 and set secrets.", 503);
  }

  const ext = photoExtension(contentType);
  const r2Key = `vans/${vanListingId}/${nanoid(12)}.${ext}`;

  const signedUrl = await generatePresignedPut({
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    key: r2Key,
    contentType,
    expiresIn: 300, // 5 minutes
  });

  return NextResponse.json({ signedUrl, r2Key });
}

// Minimal SigV4 presigned PUT URL for Cloudflare R2 (S3-compatible)
async function generatePresignedPut(opts: {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  key: string;
  contentType: string;
  expiresIn: number;
}): Promise<string> {
  const { accountId, accessKeyId, secretAccessKey, bucket, key, contentType, expiresIn } = opts;
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  const region = "auto";
  const service = "s3";

  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const datetime = now.toISOString().replace(/[:-]/g, "").slice(0, 15) + "Z";

  const credentialScope = `${date}/${region}/${service}/aws4_request`;
  const credential = `${accessKeyId}/${credentialScope}`;

  const queryParams = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": credential,
    "X-Amz-Date": datetime,
    "X-Amz-Expires": String(expiresIn),
    "X-Amz-SignedHeaders": "content-type;host",
  });

  const host = `${accountId}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${bucket}/${key}`;
  const canonicalQueryString = queryParams.toString();
  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\n`;
  const signedHeaders = "content-type;host";

  const canonicalRequest = [
    "PUT",
    canonicalUri,
    canonicalQueryString,
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
