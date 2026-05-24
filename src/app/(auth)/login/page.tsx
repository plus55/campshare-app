"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [magicSent, setMagicSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"email" | "google" | "magic" | null>(null);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading("email");
    setError(null);
    const res = await signIn.email({ email, password });
    setLoading(null);
    if (res.error) {
      setError(res.error.message ?? "Unable to sign in.");
      return;
    }
    router.push("/dashboard");
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
      <div className="rounded-2xl border border-border bg-card p-8 shadow">
        <h1 className="mb-2 font-serif text-2xl text-forest-deep dark:text-cream">Check your email</h1>
        <p className="text-muted-foreground">
          We sent a sign-in link to <strong className="font-medium text-foreground">{email}</strong>. It expires in 15 minutes.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-8 shadow">
      <h1 className="mb-1 font-serif text-2xl text-forest-deep dark:text-cream">Sign in</h1>
      <p className="mb-6 text-sm text-muted-foreground">Welcome back to CampShare.</p>

      {error && (
        <div className="mb-4 rounded-[var(--radius)] bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
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

      <Divider />

      <form onSubmit={handleEmail} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="email" className="mb-1.5 text-xs text-muted-foreground">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="h-11 bg-background text-[0.95rem]"
          />
        </div>
        <div>
          <Label htmlFor="password" className="mb-1.5 text-xs text-muted-foreground">Password</Label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="h-11 bg-background text-[0.95rem]"
          />
        </div>
        <Button
          type="submit"
          disabled={loading !== null}
          className="h-11 w-full text-[0.95rem]"
        >
          {loading === "email" ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <Button
        type="button"
        variant="outline"
        onClick={handleMagic}
        disabled={loading !== null}
        className="mt-3 h-11 w-full text-[0.95rem]"
      >
        {loading === "magic" ? "Sending…" : "Email me a magic link"}
      </Button>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        <Link href="/forgot-password" className="text-clay hover:text-clay-deep">Forgot password?</Link>
        {" · "}
        <Link href="/signup" className="text-clay hover:text-clay-deep">Create an account</Link>
      </p>
    </div>
  );
}

function Divider() {
  return (
    <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
      <span className="flex-1 border-t border-border" />
      OR
      <span className="flex-1 border-t border-border" />
    </div>
  );
}
