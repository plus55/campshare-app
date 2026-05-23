import { toNextJsHandler } from "better-auth/next-js";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";

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

  const pathname = new URL(request.url).pathname;
  const requiresBotCheck =
    pathname.endsWith("/sign-up/email") ||
    pathname.endsWith("/sign-in/magic-link");
  const token = request.headers.get("x-turnstile-token") ?? undefined;

  if (requiresBotCheck && !(await verifyTurnstile(token))) {
    return NextResponse.json(
      { error: "Security check failed. Please refresh and try again." },
      { status: 400 }
    );
  }

  return toNextJsHandler((await auth()).handler).POST(request);
}
