import { NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { generatePresignedPut, getR2Credentials } from "@/lib/r2-presign";
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

  const creds = await getR2Credentials();
  if (!creds) {
    return bad("Photo uploads are not yet configured. Enable R2 and set secrets.", 503);
  }

  const ext = photoExtension(contentType);
  const r2Key = `vans/${vanListingId}/${nanoid(12)}.${ext}`;

  const signedUrl = await generatePresignedPut({
    creds,
    bucket: "campshare-photos",
    key: r2Key,
    contentType,
    expiresIn: 300, // 5 minutes
  });

  return NextResponse.json({ signedUrl, r2Key });
}
