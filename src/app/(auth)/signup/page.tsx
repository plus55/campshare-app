"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn, signUp } from "@/lib/auth-client";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [magicSent, setMagicSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"email" | "google" | "magic" | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  async function verifyBot(): Promise<boolean> {
    if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) return true;
    if (!turnstileToken) {
      setError("Please wait for the security check to complete.");
      return false;
    }
    const res = await fetch("/api/verify-turnstile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: turnstileToken }),
    });
    if (!res.ok) {
      setError("Security check failed. Please refresh and try again.");
      return false;
    }
    return true;
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!(await verifyBot())) return;
    setLoading("email");
    setError(null);
    const res = await signUp.email({ name, email, password });
    setLoading(null);
    if (res.error) {
      setError(res.error.message ?? "Unable to create account.");
      return;
    }
    router.push("/verify-email?email=" + encodeURIComponent(email));
  }

  async function handleGoogle() {
    setLoading("google");
    setError(null);
    await signIn.social({ provider: "google", callbackURL: "/dashboard" });
  }

  async function handleMagic() {
    if (!email) {
      setError("Enter your email to receive a magic link.");
      return;
    }
    if (!(await verifyBot())) return;
    setLoading("magic");
    setError(null);
    const res = await signIn.magicLink({ email, callbackURL: "/dashboard" });
    setLoading(null);
    if (res.error) {
      setError(res.error.message ?? "Couldn't send magic link.");
      return;
    }
    setMagicSent(true);
  }

  if (magicSent) {
    return (
      <div className="rounded-2xl bg-cream p-8 shadow">
        <h1 className="mb-2 font-serif text-2xl text-forest-deep">Check your email</h1>
        <p className="text-stone">
          We sent a sign-in link to <strong className="font-medium text-charcoal">{email}</strong>. It expires in 15 minutes.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-cream p-8 shadow">
      <h1 className="mb-1 font-serif text-2xl text-forest-deep">Create your account</h1>
      <p className="mb-6 text-sm text-stone">Join CampShare in under a minute.</p>

      {error && (
        <div className="mb-4 rounded-[var(--radius)] bg-rust-light px-3.5 py-2.5 text-sm text-rust">
          {error}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={handleGoogle}
        disabled={loading !== null}
        className="mb-3 h-11 w-full text-[0.95rem]"
      >
        Continue with Google
      </Button>

      <form onSubmit={handleEmail} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="name" className="mb-1.5 text-xs text-stone">Name</Label>
          <Input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            className="h-11 bg-cream text-[0.95rem]"
          />
        </div>
        <div>
          <Label htmlFor="email" className="mb-1.5 text-xs text-stone">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="h-11 bg-cream text-[0.95rem]"
          />
        </div>
        <div>
          <Label htmlFor="password" className="mb-1.5 text-xs text-stone">Password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className="h-11 bg-cream text-[0.95rem]"
          />
        </div>
        <Button
          type="submit"
          disabled={loading !== null}
          className="h-11 w-full text-[0.95rem]"
        >
          {loading === "email" ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <TurnstileWidget onToken={setTurnstileToken} />

      <Button
        type="button"
        variant="outline"
        onClick={handleMagic}
        disabled={loading !== null}
        className="mt-3 h-11 w-full text-[0.95rem]"
      >
        {loading === "magic" ? "Sending…" : "Email me a magic link"}
      </Button>

      <p className="mt-5 text-center text-sm text-stone">
        Already have an account?{" "}
        <Link href="/login" className="text-clay hover:text-clay-deep">Sign in</Link>
      </p>
    </div>
  );
}
