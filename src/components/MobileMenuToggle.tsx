"use client";

import { useState } from "react";

export default function MobileMenuToggle() {
  const [open, setOpen] = useState(false);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    const links = document.querySelector(".nav-links");
    if (links) links.classList.toggle("open", next);
  };

  return (
    <button
      type="button"
      className="menu-toggle"
      aria-label={open ? "Close menu" : "Open menu"}
      aria-expanded={open}
      onClick={toggle}
    >
      <span />
      <span />
      <span />
    </button>
  );
}
