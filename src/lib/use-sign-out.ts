"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signOut } from "@/lib/auth-client";

export function useSignOutAction() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const performSignOut = useCallback(async () => {
    if (isSigningOut) return;

    setIsSigningOut(true);
    try {
      const result = await signOut();
      if (result.error) {
        throw new Error(result.error.message ?? "Sign out failed");
      }
      router.replace("/login");
      router.refresh();
    } catch {
      toast.error("Could not sign out. Please try again.");
      setIsSigningOut(false);
    }
  }, [isSigningOut, router]);

  return { isSigningOut, performSignOut };
}
