import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { reorderPhotosHandler } from "./handler";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const result = await reorderPhotosHandler({
    db: db(),
    userId: session.user.id,
    body,
  });
  return NextResponse.json(result.body, { status: result.status });
}
