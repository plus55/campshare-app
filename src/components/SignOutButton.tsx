"use client";

import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function SignOutButton() {
  const router = useRouter();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => signOut({ fetchOptions: { onSuccess: () => router.push("/login") } })}
    >
      Sign out
    </Button>
  );
}
