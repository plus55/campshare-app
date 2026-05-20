"use client";

import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="cs-btn cs-btn-ghost"
      onClick={() => signOut({ fetchOptions: { onSuccess: () => router.push("/login") } })}
    >
      Sign out
    </button>
  );
}
