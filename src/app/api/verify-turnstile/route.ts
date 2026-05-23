import { NextResponse } from "next/server";
import { verifyTurnstile } from "@/lib/turnstile";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { token?: string } | null;
  if (!body?.token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }
  const ok = await verifyTurnstile(body.token);
  if (!ok) {
    return NextResponse.json({ error: "Bot check failed. Please try again." }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}
