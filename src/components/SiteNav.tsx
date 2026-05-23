"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Moon, Sun, Menu, X } from "lucide-react";
import { useTheme } from "next-themes";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import NotificationBell from "./NotificationBell";
import UserMenu from "./UserMenu";

interface SiteNavProps {
  user: { name: string; email: string } | null;
  unreadCount: number;
}

function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function SiteNav({ user, unreadCount }: SiteNavProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const navLinks = user
    ? [
        { href: "/vans", label: "Find a van" },
        { href: "/trips", label: "My trips" },
        { href: "/dashboard", label: "Dashboard" },
      ]
    : [
        { href: "/vans", label: "Find a van" },
        { href: "/apply", label: "Become a host" },
      ];

  return (
    <nav
      className="flex items-center justify-between px-[var(--gutter)] py-[1.1rem] max-w-[var(--max)] mx-auto gap-8"
      aria-label="Primary"
    >
      {/* Brand */}
      <Link
        href="/"
        className="flex items-center gap-[0.55rem] font-serif text-[1.45rem] font-semibold text-forest-deep tracking-[-0.02em] no-underline hover:text-forest-deep"
      >
        <span className="brand-mark" aria-hidden="true" />
        CampShare
        <small className="block font-sans text-[0.65rem] font-medium tracking-[0.2em] text-stone uppercase mt-[-2px]">
          Aotearoa NZ
        </small>
      </Link>

      {/* Desktop nav links */}
      <ul className="hidden md:flex gap-8 list-none items-center m-0 p-0 flex-1">
        {navLinks.map(({ href, label }) => {
          const active = isActive(href, pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative text-[0.95rem] font-medium transition-colors no-underline",
                  "focus-visible:outline-2 focus-visible:outline-clay focus-visible:outline-offset-4 focus-visible:rounded-sm",
                  active
                    ? "text-forest-deep after:absolute after:bottom-[-6px] after:left-0 after:right-0 after:h-[2px] after:bg-clay after:content-['']"
                    : "text-charcoal-soft hover:text-forest-deep"
                )}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Right-side actions */}
      <div className="flex gap-2 items-center">
        {user ? (
          <>
            <NotificationBell initialUnread={unreadCount} />
            <UserMenu name={user.name} email={user.email} />
          </>
        ) : (
          <>
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "hidden md:inline-flex border-forest text-forest hover:bg-forest hover:text-cream"
              )}
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className={cn(buttonVariants({ size: "sm" }), "hidden md:inline-flex")}
            >
              Sign up
            </Link>
          </>
        )}

        {/* Theme toggle */}
        <button
          type="button"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="hidden md:inline-flex items-center justify-center size-8 rounded-lg text-forest-deep hover:bg-sand transition-colors border-0 bg-transparent cursor-pointer"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="md:hidden flex items-center justify-center p-[0.4rem] bg-transparent border-0 cursor-pointer text-forest-deep"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="absolute top-full left-0 right-0 flex flex-col bg-cream border-b border-line px-[var(--gutter)] py-4 gap-1 z-50 md:hidden shadow-md">
          {navLinks.map(({ href, label }) => {
            const active = isActive(href, pathname);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "py-2 px-1 text-[0.95rem] font-medium no-underline transition-colors rounded",
                  active ? "text-forest-deep" : "text-charcoal-soft hover:text-forest-deep"
                )}
                onClick={() => setMobileOpen(false)}
              >
                {label}
              </Link>
            );
          })}
          {!user && (
            <div className="flex gap-2 pt-3 border-t border-line mt-2">
              <Link
                href="/login"
                className="btn btn-ghost btn-sm flex-1 text-center"
                onClick={() => setMobileOpen(false)}
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="btn btn-primary btn-sm flex-1 text-center"
                onClick={() => setMobileOpen(false)}
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
