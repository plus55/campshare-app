"use client";

import Link from "next/link";
import { useState } from "react";
import { requestPasswordReset } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });
    setLoading(false);
    if (res.error) {
      setError(res.error.message ?? "Unable to send reset email.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="cs-card">
        <h1>Check your inbox</h1>
        <p>
          If an account exists for <strong>{email}</strong>, you&apos;ll receive
          a password reset link in the next minute or two.
        </p>
        <p style={{ marginTop: 16 }} className="cs-small">
          <Link href="/login">Back to sign in</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="cs-card">
      <h1>Reset your password</h1>
      <p className="cs-muted">
        Enter the email associated with your account and we&apos;ll send you a
        link to choose a new password.
      </p>

      {error && <div className="cs-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="cs-field">
          <label className="cs-label">Email</label>
          <input
            type="email"
            required
            className="cs-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="cs-btn cs-btn-primary cs-btn-block"
        >
          {loading ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <p style={{ marginTop: 20, textAlign: "center" }} className="cs-small">
        <Link href="/login">Back to sign in</Link>
      </p>
    </div>
  );
}
