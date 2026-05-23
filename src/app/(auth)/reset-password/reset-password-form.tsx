"use client";

import Link from "next/link";
import { useState } from "react";
import { resetPassword } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const res = await resetPassword({ newPassword: password, token });
    setLoading(false);

    if (res.error) {
      setError(
        res.error.message ?? "Couldn't reset your password. The link may have expired."
      );
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="rounded-2xl bg-cream p-8 shadow">
        <h1 className="mb-2 font-serif text-2xl text-forest-deep">Password updated</h1>
        <p className="mb-4 text-stone">You can now sign in with your new password.</p>
        <Link href="/login" className="text-sm text-clay hover:text-clay-deep">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-cream p-8 shadow">
      <h1 className="mb-1 font-serif text-2xl text-forest-deep">Choose a new password</h1>
      <p className="mb-6 text-sm text-stone">Pick something at least 8 characters long.</p>

      {error && (
        <div className="mb-4 rounded-[var(--radius)] bg-rust-light px-3.5 py-2.5 text-sm text-rust">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="password" className="mb-1.5 text-xs text-stone">New password</Label>
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
        <div>
          <Label htmlFor="confirm" className="mb-1.5 text-xs text-stone">Confirm password</Label>
          <Input
            id="confirm"
            type="password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            className="h-11 bg-cream text-[0.95rem]"
          />
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="h-11 w-full text-[0.95rem]"
        >
          {loading ? "Updating…" : "Update password"}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-stone">
        <Link href="/login" className="text-clay hover:text-clay-deep">Back to sign in</Link>
      </p>
    </div>
  );
}
