import { NextResponse } from "next/server";

// Deprecated in Sprint 3 — host application flow replaced by dashboard listing creation.
export async function POST() {
  return NextResponse.json(
    { error: "This endpoint has been replaced. Use /api/listings instead." },
    { status: 410 }
  );
}
