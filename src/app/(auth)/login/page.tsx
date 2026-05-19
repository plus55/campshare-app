"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [magicSent, setMagicSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"email" | "google" | "magic" | null>(
    null
  );

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
      <div className="cs-card">
        <h1>Check your email</h1>
        <p>
          We sent a sign-in link to <strong>{email}</strong>. It expires in 15
          minutes.
        </p>
      </div>
    );
  }

  return (
    <div className="cs-card">
      <h1>Sign in</h1>
      <p className="cs-muted">Welcome back to CampShare.</p>

      {error && <div className="cs-error">{error}</div>}

      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading !== null}
        className="cs-btn cs-btn-ghost cs-btn-block"
        style={{ marginBottom: 12 }}
      >
        Continue with Google
      </button>

      <Divider />

      <form onSubmit={handleEmail}>
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
        <div className="cs-field">
          <label className="cs-label">Password</label>
          <input
            type="password"
            required
            className="cs-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <button
          type="submit"
          disabled={loading !== null}
          className="cs-btn cs-btn-primary cs-btn-block"
        >
          {loading === "email" ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <button
        type="button"
        onClick={handleMagic}
        disabled={loading !== null}
        className="cs-btn cs-btn-ghost cs-btn-block"
        style={{ marginTop: 12 }}
      >
        {loading === "magic" ? "Sending…" : "Email me a magic link"}
      </button>

      <p style={{ marginTop: 20, textAlign: "center" }} className="cs-small">
        <Link href="/forgot-password">Forgot password?</Link>
        {" · "}
        <Link href="/signup">Create an account</Link>
      </p>
    </div>
  );
}

function Divider() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        margin: "16px 0",
        color: "var(--ink-300)",
        fontSize: 12,
      }}
    >
      <span style={{ flex: 1, height: 1, background: "var(--sand-200)" }} />
      OR
      <span style={{ flex: 1, height: 1, background: "var(--sand-200)" }} />
    </div>
  );
}
