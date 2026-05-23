import { getCloudflareContext } from "@opennextjs/cloudflare";

interface RateLimiter {
  limit(opts: { key: string }): Promise<{ success: boolean }>;
}

export async function checkRateLimit(binding: string, key: string): Promise<boolean> {
  try {
    const { env } = getCloudflareContext();
    const limiter = (env as unknown as Record<string, unknown>)[binding] as RateLimiter | undefined;
    if (typeof limiter?.limit !== "function") return true;
    const { success } = await limiter.limit({ key });
    return success;
  } catch {
    return true;
  }
}
