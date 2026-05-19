import { NextResponse } from "next/server";

// Deprecated in Sprint 3 — application review replaced by listing moderation.
export async function PATCH() {
  return NextResponse.json(
    { error: "This endpoint has been replaced. Use /api/admin/listings/[id] instead." },
    { status: 410 }
  );
}
