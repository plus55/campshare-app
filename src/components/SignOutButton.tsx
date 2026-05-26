"use client";

import { Button } from "@/components/ui/button";
import { useSignOutAction } from "@/lib/use-sign-out";

export default function SignOutButton() {
  const { isSigningOut, performSignOut } = useSignOutAction();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isSigningOut}
      onClick={() => void performSignOut()}
    >
      {isSigningOut ? "Signing out..." : "Sign out"}
    </Button>
  );
}
