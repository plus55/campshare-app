import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  return toNextJsHandler((await auth()).handler).GET(request);
}

export async function POST(request: Request) {
  return toNextJsHandler((await auth()).handler).POST(request);
}
