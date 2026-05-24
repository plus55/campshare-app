"use client";

import Link from "next/link";
import { useState } from "react";
import { requestPasswordReset } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await requestPasswordReset({ email, redirectTo: "/reset-password" });
    setLoading(false);
    if (res.error) {
      setError(res.error.message ?? "Unable to send reset email.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 shadow">
        <h1 className="mb-2 font-serif text-2xl text-forest-deep dark:text-cream">Check your inbox</h1>
        <p className="mb-4 text-muted-foreground">
          If an account exists for <strong className="font-medium text-foreground">{email}</strong>, you&apos;ll receive a password reset link in the next minute or two.
        </p>
        <Link href="/login" className="text-sm text-clay hover:text-clay-deep">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-8 shadow">
      <h1 className="mb-1 font-serif text-2xl text-forest-deep dark:text-cream">Reset your password</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Enter the email associated with your account and we&apos;ll send you a link to choose a new password.
      </p>

      {error && (
        <div className="mb-4 rounded-[var(--radius)] bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
        <Button
          type="submit"
          disabled={loading}
          className="h-11 w-full text-[0.95rem]"
        >
          {loading ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        <Link href="/login" className="text-clay hover:text-clay-deep">Back to sign in</Link>
      </p>
    </div>
  );
}
