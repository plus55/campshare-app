"use client";

import Link from "next/link";
import { useState } from "react";
import { resetPassword } from "@/lib/auth-client";

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
        res.error.message ??
          "Couldn't reset your password. The link may have expired."
      );
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="cs-card">
        <h1>Password updated</h1>
        <p>You can now sign in with your new password.</p>
        <p style={{ marginTop: 16 }} className="cs-small">
          <Link href="/login">Sign in</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="cs-card">
      <h1>Choose a new password</h1>
      <p className="cs-muted">Pick something at least 8 characters long.</p>

      {error && <div className="cs-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="cs-field">
          <label className="cs-label">New password</label>
          <input
            type="password"
            required
            minLength={8}
            className="cs-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div className="cs-field">
          <label className="cs-label">Confirm password</label>
          <input
            type="password"
            required
            minLength={8}
            className="cs-input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="cs-btn cs-btn-primary cs-btn-block"
        >
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>

      <p style={{ marginTop: 20, textAlign: "center" }} className="cs-small">
        <Link href="/login">Back to sign in</Link>
      </p>
    </div>
  );
}
