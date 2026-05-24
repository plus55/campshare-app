"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Globe, LogIn, UserPlus } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  heading?: string;
  subheading?: string;
}

export default function AuthModal({ open, onClose, heading, subheading }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const callbackURL = typeof window !== "undefined" ? window.location.href : "/dashboard";

  function reset() {
    setSent(false);
    setError(null);
    setEmail("");
    setPassword("");
    setName("");
    setTurnstileToken(null);
  }

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

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-[440px] bg-card border-border rounded-[var(--radius-xl)] p-8">
        <div className="mb-6">
          <DialogTitle className="text-[22px] font-serif font-medium text-foreground m-0 mb-[6px]">
            {heading ?? "Sign in to continue"}
          </DialogTitle>
          {subheading && (
            <p className="text-[14px] text-muted-foreground m-0">{subheading}</p>
          )}
        </div>

        {/* Google */}
        <Button
          type="button"
          variant="outline"
          className="w-full mb-4 gap-[10px] border-border"
          onClick={handleGoogle}
          disabled={loading}
        >
          <Globe size={16} />
          Continue with Google
        </Button>

        <div className="flex items-center gap-3 mb-4">
          <hr className="flex-1 border-0 border-t border-border" />
          <span className="text-[12px] text-muted-foreground">or</span>
          <hr className="flex-1 border-0 border-t border-border" />
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive rounded-[var(--radius)] text-[14px] px-[14px] py-[10px] mb-3" role="alert" aria-live="polite">
            {error}
          </div>
        )}

        <Tabs defaultValue="magic" onValueChange={() => reset()}>
          <TabsList className="w-full bg-muted rounded-[var(--radius)] p-1 mb-5">
            <TabsTrigger value="magic" className="flex-1 gap-[6px] text-[13px] data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Mail size={13} />
              Magic link
            </TabsTrigger>
            <TabsTrigger value="signup" className="flex-1 gap-[6px] text-[13px] data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <UserPlus size={13} />
              Create account
            </TabsTrigger>
          </TabsList>

          <TabsContent value="magic">
            {sent ? (
              <div className="text-center py-4">
                <Mail size={32} className="text-clay mx-auto mb-3" />
                <p className="font-semibold m-0 mb-[6px]">Check your inbox</p>
                <p className="text-muted-foreground text-[14px] m-0 mb-4">
                  We sent a sign-in link to <strong>{email}</strong>
                </p>
                <Button variant="outline" size="sm" onClick={reset} className="border-border">
                  Use a different email
                </Button>
              </div>
            ) : (
              <form onSubmit={handleMagicLink} className="flex flex-col gap-3">
                <div className="flex flex-col gap-[6px]">
                  <Label htmlFor="magic-email" className="text-[13px] text-muted-foreground font-medium">
                    Email address
                  </Label>
                  <Input
                    id="magic-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    autoFocus
                    required
                    className="border-border focus:border-clay"
                  />
                </div>
                <TurnstileWidget onToken={setTurnstileToken} />
                <Button type="submit" className="w-full gap-[6px]" disabled={loading}>
                  <LogIn size={15} />
                  {loading ? "Sending…" : "Send magic link"}
                </Button>
              </form>
            )}
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignup} className="flex flex-col gap-3">
              <div className="flex flex-col gap-[6px]">
                <Label htmlFor="signup-name" className="text-[13px] text-muted-foreground font-medium">Full name</Label>
                <Input
                  id="signup-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  autoFocus
                  required
                  className="border-border focus:border-clay"
                />
              </div>
              <div className="flex flex-col gap-[6px]">
                <Label htmlFor="signup-email" className="text-[13px] text-muted-foreground font-medium">Email address</Label>
                <Input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  required
                  className="border-border focus:border-clay"
                />
              </div>
              <div className="flex flex-col gap-[6px]">
                <Label htmlFor="signup-password" className="text-[13px] text-muted-foreground font-medium">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Choose a password"
                  required
                  minLength={8}
                  className="border-border focus:border-clay"
                />
              </div>
              <TurnstileWidget onToken={setTurnstileToken} />
              <Button type="submit" className="w-full gap-[6px]" disabled={loading}>
                <UserPlus size={15} />
                {loading ? "Creating account…" : "Create account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <p className={cn("mt-4 text-[12px] text-muted-foreground text-center")}>
          Already have an account?{" "}
          <a
            href={`/login?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "/")}`}
            className="text-clay hover:text-clay-deep"
          >
            Sign in
          </a>
        </p>
      </DialogContent>
    </Dialog>
  );
}
