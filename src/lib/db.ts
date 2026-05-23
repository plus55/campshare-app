import { getCloudflareContext } from "@opennextjs/cloudflare";

// Sync variant — works in Cloudflare route handlers where context is synchronously available.
export function db(): D1Database {
  const { env } = getCloudflareContext();
  return (env as unknown as { DB: D1Database }).DB;
}

// Async variant — use in React Server Components (RSC) where async context is required.
export async function getDb(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  return (env as unknown as { DB: D1Database }).DB;
}
