"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

export default function UserMenu({ name, email }: { name: string; email: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleSignOut = () => {
    setOpen(false);
    signOut({ fetchOptions: { onSuccess: () => router.push("/login") } });
  };

  const initial = (name || email || "?").trim().charAt(0).toUpperCase();
  const close = () => setOpen(false);

  return (
    <div className="user-menu" ref={ref}>
      <button
        type="button"
        className="user-menu-button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen(!open)}
      >
        <span className="user-menu-avatar">{initial}</span>
      </button>

      {open ? (
        <div className="user-menu-panel" role="menu">
          <div className="user-menu-header">
            <strong>{name}</strong>
            {email && email !== name ? <span>{email}</span> : null}
          </div>
          <Link href="/dashboard" role="menuitem" onClick={close}>Dashboard</Link>
          <Link href="/dashboard/bookings" role="menuitem" onClick={close}>Bookings</Link>
          <Link href="/trips" role="menuitem" onClick={close}>My trips</Link>
          <Link href="/dashboard/saved" role="menuitem" onClick={close}>Saved</Link>
          <Link href="/dashboard/reviews" role="menuitem" onClick={close}>Reviews</Link>
          <Link href="/dashboard/payouts" role="menuitem" onClick={close}>Payouts</Link>
          <Link href="/dashboard/profile" role="menuitem" onClick={close}>Profile</Link>
          <div className="user-menu-divider" />
          <button type="button" role="menuitem" onClick={handleSignOut}>Sign out</button>
        </div>
      ) : null}
    </div>
  );
}
