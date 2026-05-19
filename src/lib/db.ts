import { getCloudflareContext } from "@opennextjs/cloudflare";

export function db(): D1Database {
  const { env } = getCloudflareContext();
  return (env as unknown as { DB: D1Database }).DB;
}
