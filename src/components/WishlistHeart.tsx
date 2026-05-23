"use client";

import { useState } from "react";
import AuthModal from "@/components/AuthModal";

interface Props {
  vanListingId: string;
  initialSaved: boolean;
  className?: string;
}

export default function WishlistHeart({ vanListingId, initialSaved, className }: Props) {
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);

    const optimistic = !saved;
    setSaved(optimistic);

    try {
      const res = saved
        ? await fetch(`/api/wishlist?vanListingId=${encodeURIComponent(vanListingId)}`, { method: "DELETE" })
        : await fetch("/api/wishlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ vanListingId }),
          });

      if (res.status === 401) {
        setSaved(saved);
        setAuthOpen(true);
        return;
      }
      if (!res.ok) {
        setSaved(saved);
      }
    } catch {
      setSaved(saved);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-label={saved ? "Remove from saved" : "Save this van"}
        className={`flex size-[34px] cursor-pointer items-center justify-center rounded-full border-0 bg-white/88 transition-transform hover:scale-110 hover:bg-white ${className ?? ""}`}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill={saved ? "var(--clay)" : "none"}
          stroke={saved ? "var(--clay)" : "currentColor"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </button>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        heading="Save this van"
        subheading="Sign in to add this van to your saved list."
      />
    </>
  );
}
