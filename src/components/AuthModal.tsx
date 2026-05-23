"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Globe, LogIn, UserPlus } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { authClient } from "@/lib/auth-client";
import { TurnstileWidget } from "@/components/TurnstileWidget";

interface Props {
  open: boolean;
  onClose: () => void;
  heading?: string;
  subheading?: string;
}

type Tab = "magic" | "signup";

export default function AuthModal({ open, onClose, heading, subheading }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const callbackURL = typeof window !== "undefined" ? window.location.href : "/dashboard";

  function verifyBot(): boolean {
    if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) return true;
    if (!turnstileToken) {
      setError("Please wait for the security check to complete.");
      return false;
    }
    return true;
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) { setError("Please enter your email"); return; }
    if (!verifyBot()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authClient.signIn.magicLink(
        { email, callbackURL },
        { headers: { "x-turnstile-token": turnstileToken ?? "" } }
      );
      if (res.error) {
        setError(res.error.message ?? "Couldn't send magic link");
        return;
      }
      setSent(true);
    } catch {
      setError("Couldn't send magic link — please try again");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !password) { setError("Please fill in all fields"); return; }
    if (!verifyBot()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authClient.signUp.email(
        { name, email, password, callbackURL: "/verify-email?email=" + encodeURIComponent(email) },
        { headers: { "x-turnstile-token": turnstileToken ?? "" } }
      );
      if (res.error) {
        setError(res.error.message ?? "Could not create account");
      } else {
        router.push("/verify-email?email=" + encodeURIComponent(email));
        onClose();
      }
    } catch {
      setError("Could not create account — please try again");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    setError(null);
    try {
      await authClient.signIn.social({ provider: "google", callbackURL });
    } catch {
      setError("Google sign-in failed — please try another method");
      setLoading(false);
    }
  }

  function reset() {
    setSent(false);
    setError(null);
    setEmail("");
    setPassword("");
    setName("");
    setTurnstileToken(null);
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: "0 0 6px", fontSize: 22 }}>{heading ?? "Sign in to continue"}</h2>
        {subheading && <p className="cs-muted" style={{ margin: 0, fontSize: 14 }}>{subheading}</p>}
      </div>

      {/* Google */}
      <button
        type="button"
        className="cs-btn cs-btn-ghost cs-btn-block"
        onClick={handleGoogle}
        disabled={loading}
        style={{ marginBottom: 16, gap: 10 }}
      >
        <Globe size={16} />
        Continue with Google
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <hr style={{ flex: 1, border: "none", borderTop: "1px solid var(--line)" }} />
        <span className="cs-muted" style={{ fontSize: 12 }}>or</span>
        <hr style={{ flex: 1, border: "none", borderTop: "1px solid var(--line)" }} />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "var(--sand-100)", borderRadius: "var(--radius)", padding: 4 }}>
        <button
          type="button"
          onClick={() => { setTab("magic"); reset(); }}
          style={{
            flex: 1, padding: "8px 0", borderRadius: "var(--radius-sm)", border: 0,
            background: tab === "magic" ? "var(--cream)" : "transparent",
            boxShadow: tab === "magic" ? "var(--shadow-sm)" : "none",
            fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500,
            color: tab === "magic" ? "var(--ink-900)" : "var(--stone)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          <Mail size={13} />
          Magic link
        </button>
        <button
          type="button"
          onClick={() => { setTab("signup"); reset(); }}
          style={{
            flex: 1, padding: "8px 0", borderRadius: "var(--radius-sm)", border: 0,
            background: tab === "signup" ? "var(--cream)" : "transparent",
            boxShadow: tab === "signup" ? "var(--shadow-sm)" : "none",
            fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500,
            color: tab === "signup" ? "var(--ink-900)" : "var(--stone)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          <UserPlus size={13} />
          Create account
        </button>
      </div>

      {error && <p className="cs-error" style={{ margin: "0 0 12px" }}>{error}</p>}

      {tab === "magic" ? (
        sent ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <Mail size={32} style={{ color: "var(--clay-500)", marginBottom: 12 }} />
            <p style={{ fontWeight: 600, margin: "0 0 6px" }}>Check your inbox</p>
            <p className="cs-muted" style={{ margin: "0 0 16px", fontSize: 14 }}>
              We sent a sign-in link to <strong>{email}</strong>
            </p>
            <button
              type="button"
              className="cs-btn cs-btn-ghost"
              onClick={reset}
              style={{ fontSize: 13 }}
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleMagicLink} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label className="cs-field" style={{ margin: 0 }}>
              <span className="cs-label">Email address</span>
              <input
                type="email"
                className="cs-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                autoFocus
                required
              />
            </label>
            <button type="submit" className="cs-btn cs-btn-primary cs-btn-block" disabled={loading}>
              <LogIn size={15} />
              {loading ? "Sending…" : "Send magic link"}
            </button>
          </form>
        )
      ) : (
        <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label className="cs-field" style={{ margin: 0 }}>
            <span className="cs-label">Full name</span>
            <input
              type="text"
              className="cs-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoFocus
              required
            />
          </label>
          <label className="cs-field" style={{ margin: 0 }}>
            <span className="cs-label">Email address</span>
            <input
              type="email"
              className="cs-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              required
            />
          </label>
          <label className="cs-field" style={{ margin: 0 }}>
            <span className="cs-label">Password</span>
            <input
              type="password"
              className="cs-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Choose a password"
              required
              minLength={8}
            />
          </label>
          <button type="submit" className="cs-btn cs-btn-primary cs-btn-block" disabled={loading}>
            <UserPlus size={15} />
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
      )}

      {!sent && <TurnstileWidget onToken={setTurnstileToken} />}

      <p className="cs-muted" style={{ marginTop: 16, fontSize: 12, textAlign: "center" }}>
        Already have an account?{" "}
        <a href={`/login?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "/")}`} style={{ color: "var(--clay-500)" }}>
          Sign in
        </a>
      </p>
    </Modal>
  );
}
