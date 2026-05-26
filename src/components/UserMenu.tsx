"use client";

import Link from "next/link";
import { useSignOutAction } from "@/lib/use-sign-out";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function UserMenu({ name, email }: { name: string; email: string }) {
  const { isSigningOut, performSignOut } = useSignOutAction();
  const initial = (name || email || "?").trim().charAt(0).toUpperCase();

  const menuItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/dashboard/bookings", label: "Bookings" },
    { href: "/trips", label: "My trips" },
    { href: "/dashboard/saved", label: "Saved" },
    { href: "/dashboard/reviews", label: "Reviews" },
    { href: "/dashboard/notifications", label: "Notifications" },
    { href: "/dashboard/payouts", label: "Payouts" },
    { href: "/dashboard/profile", label: "Profile" },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="inline-flex items-center justify-center size-[38px] rounded-full bg-forest text-cream font-serif font-medium text-base border-[1.5px] border-ochre transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-clay focus-visible:outline-offset-2 cursor-pointer"
      >
        {initial}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-56 bg-card border-border shadow-[0_18px_50px_-12px_rgba(31,42,32,0.18)]"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="mb-1 border-b border-border pb-2 font-normal">
            <div className="font-serif text-forest-deep dark:text-cream text-[0.95rem]">{name}</div>
            {email && email !== name && (
              <div className="text-[0.78rem] text-muted-foreground truncate">{email}</div>
            )}
          </DropdownMenuLabel>

          {menuItems.map(({ href, label }) => (
            <DropdownMenuItem
              key={href}
              render={<Link href={href} />}
              className="text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="bg-border" />

        <DropdownMenuItem
          closeOnClick={false}
          disabled={isSigningOut}
          onClick={() => void performSignOut()}
          className="text-muted-foreground hover:text-foreground cursor-pointer"
        >
          {isSigningOut ? "Signing out..." : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
