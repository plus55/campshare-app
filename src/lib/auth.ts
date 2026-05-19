import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { sendBrandedEmail } from "./email";

async function buildAuth() {
  const { env } = await getCloudflareContext({ async: true });
  const typedEnv = env as unknown as {
    DB: D1Database;
    BETTER_AUTH_SECRET?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
  };

  return betterAuth({
    appName: "CampShare",
    baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    secret: typedEnv.BETTER_AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET,

    database: typedEnv.DB,

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }) => {
        await sendBrandedEmail({
          to: user.email,
          subject: "Reset your CampShare password",
          heading: "Reset your password",
          intro:
            "We received a request to reset your CampShare password. " +
            "Click the button below to choose a new one. " +
            "This link expires in 60 minutes.",
          cta: { label: "Reset password", href: url },
        });
      },
    },

    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        await sendBrandedEmail({
          to: user.email,
          subject: "Verify your CampShare email",
          heading: "Welcome to CampShare",
          intro:
            "Thanks for signing up. Verify your email to start exploring " +
            "and applying to list your van.",
          cta: { label: "Verify email", href: url },
        });
      },
    },

    socialProviders: {
      google: {
        clientId: typedEnv.GOOGLE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: typedEnv.GOOGLE_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? "",
      },
    },

    plugins: [
      magicLink({
        expiresIn: 60 * 15, // 15 minutes
        sendMagicLink: async ({ email, url }) => {
          await sendBrandedEmail({
            to: email,
            subject: "Sign in to CampShare",
            heading: "Your sign-in link",
            intro:
              "Click the button below to sign in to CampShare. " +
              "This link is valid for 15 minutes and can only be used once.",
            cta: { label: "Sign in", href: url },
          });
        },
      }),
    ],
  });
}

// Lazy singleton — first call inside a request initializes the binding.
let _authPromise: ReturnType<typeof buildAuth> | null = null;
export function auth() {
  if (!_authPromise) {
    _authPromise = buildAuth().catch((err) => {
      _authPromise = null;
      throw err;
    });
  }
  return _authPromise;
}
