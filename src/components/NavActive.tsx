"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function NavActive() {
  const pathname = usePathname();

  useEffect(() => {
    const links = document.querySelectorAll<HTMLAnchorElement>(".nav-links a");
    links.forEach((a) => {
      const href = a.getAttribute("href") ?? "";
      if (!href.startsWith("/")) {
        a.removeAttribute("aria-current");
        return;
      }
      const match = href === "/"
        ? pathname === "/"
        : pathname === href || pathname.startsWith(href + "/");
      if (match) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }, [pathname]);

  return null;
}
