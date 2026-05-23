import { toNextJsHandler } from "better-auth/next-js";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  return toNextJsHandler((await auth()).handler).GET(request);
}

export async function POST(request: Request) {
  const ip = request.headers.get("CF-Connecting-IP") ?? "global";
  const allowed = await checkRateLimit("RATE_LIMIT_AUTH", ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again." },
      { status: 429 }
    );
  }
  return toNextJsHandler((await auth()).handler).POST(request);
}
