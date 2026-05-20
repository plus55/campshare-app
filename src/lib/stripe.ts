import Stripe from "stripe";
import { getCloudflareContext } from "@opennextjs/cloudflare";

type CfEnv = { STRIPE_SECRET_KEY?: string };

let _stripe: Stripe | null = null;

export async function stripe(): Promise<Stripe> {
  if (_stripe) return _stripe;
  const { env } = await getCloudflareContext({ async: true });
  const cfEnv = env as unknown as CfEnv;
  const key = cfEnv.STRIPE_SECRET_KEY ?? process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  _stripe = new Stripe(key, {
    httpClient: Stripe.createFetchHttpClient(),
  });
  return _stripe;
}
