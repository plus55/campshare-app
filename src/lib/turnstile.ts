import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function verifyTurnstile(token: string | undefined): Promise<boolean> {
  let secret = process.env.TURNSTILE_SECRET_KEY;
  try {
    const { env } = getCloudflareContext();
    secret =
      (env as unknown as Record<string, string | undefined>).TURNSTILE_SECRET_KEY ??
      secret;
  } catch {
    // Local Next.js execution does not expose Cloudflare bindings.
  }
  if (!secret) return process.env.NODE_ENV !== "production";
  if (!token) return false;

  const resp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token }),
  });
  const data = (await resp.json()) as { success: boolean };
  return data.success;
}
