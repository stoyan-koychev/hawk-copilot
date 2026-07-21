"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/util/cn";

const LINKS = [
  { href: "/", label: "Chat" },
  { href: "/ops", label: "Traces" },
  { href: "/ops/evals", label: "Evals" },
];

function HamburgerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  );
}

/** A persistent menu (top-right on every page): hamburger → dropdown to switch pages. */
export function NavMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  // Close on an outside click.
  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="fixed right-4 top-4 z-50">
      <button
        type="button"
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-secondary/15 bg-white text-secondary shadow-sm transition hover:border-accent hover:text-primary"
      >
        <HamburgerIcon />
      </button>
      {open && (
        <nav className="absolute right-0 mt-2 w-40 overflow-hidden rounded-xl border border-secondary/10 bg-white py-1 shadow-lg">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "block px-4 py-2 text-sm transition hover:bg-background",
                  active ? "font-semibold text-primary" : "text-secondary",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
