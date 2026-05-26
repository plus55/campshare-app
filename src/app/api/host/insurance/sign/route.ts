import { NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { generatePresignedPut, getR2Credentials } from "@/lib/r2-presign";
import {
  HOST_DOCS_BUCKET,
  INSURANCE_DOC_CONTENT_TYPES,
  MAX_INSURANCE_DOC_BYTES,
  insuranceDocExtension,
} from "@/lib/insurance";

const schema = z.object({
  contentType: z.enum(INSURANCE_DOC_CONTENT_TYPES),
  sizeBytes: z.number().int().positive().max(MAX_INSURANCE_DOC_BYTES),
});

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return bad("Sign in required", 401);

  const profile = await db()
    .prepare("SELECT userId FROM host_profile WHERE userId = ?")
    .bind(session.user.id)
    .first<{ userId: string }>();
  if (!profile) return bad("Create a host profile before adding insurance", 404);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? "Invalid payload");

  const creds = await getR2Credentials();
  if (!creds) {
    return bad("Document uploads are not yet configured. Enable R2 and set secrets.", 503);
  }

  const ext = insuranceDocExtension(parsed.data.contentType);
  // Private bucket, per-host key. Never publicly served — admin reads via presigned GET.
  const r2Key = `host-docs/${session.user.id}/insurance-${nanoid(12)}.${ext}`;

  const signedUrl = await generatePresignedPut({
    creds,
    bucket: HOST_DOCS_BUCKET,
    key: r2Key,
    contentType: parsed.data.contentType,
    expiresIn: 300, // 5 minutes
  });

  return NextResponse.json({ signedUrl, r2Key });
}
