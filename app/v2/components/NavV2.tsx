"use client";

import { useState } from "react";
import Link from "next/link";

const LINKS = [
  { href: "/v2/#industries", label: "Industries" },
  { href: "/v2/#how-we-build", label: "What We Build" },
  { href: "/v2/our-story", label: "Our Story" },
  { href: "/v2/insights", label: "Insights" },
];

export function NavV2() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur-md transition-colors"
      style={{
        borderColor: "var(--n-line)",
        background: "rgba(250, 249, 246, 0.88)",
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-8">
        {/* Brand Logo (Official TwoNode Vector) */}
        <Link
          href="/v2"
          className="flex items-center transition-opacity hover:opacity-90"
          aria-label="TwoNode Technologies"
        >
          <img
            src="/logo.svg"
            alt="TwoNode Technologies"
            className="h-8 w-auto dark:brightness-0 dark:invert"
          />
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-1 rounded-full border border-[#e6e4f0] dark:border-[#29273c] bg-white/70 dark:bg-black/30 p-1 text-sm font-medium shadow-xs md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full px-4 py-1.5 text-[#48455e] dark:text-[#b8b5d0] transition-all hover:bg-[#11101e] hover:text-white dark:hover:bg-white dark:hover:text-[#11101e]"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Contact CTA */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/v2/contact"
            className="inline-flex items-center gap-2 rounded-full bg-[#11101e] px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#ff4d6d] hover:shadow-md dark:bg-white dark:text-[#11101e] dark:hover:bg-[#ff4d6d] dark:hover:text-white"
          >
            Contact
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e6e4f0] dark:border-[#29273c] text-[#11101e] dark:text-white md:hidden"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileMenuOpen}
        >
          <div className="relative h-4 w-4">
            <span
              className={`absolute left-0 top-0.5 h-0.5 w-4 bg-current transition-transform duration-200 ${
                mobileMenuOpen ? "translate-y-1.5 rotate-45" : ""
              }`}
            />
            <span
              className={`absolute left-0 top-2 h-0.5 w-4 bg-current transition-opacity duration-200 ${
                mobileMenuOpen ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute left-0 top-3.5 h-0.5 w-4 bg-current transition-transform duration-200 ${
                mobileMenuOpen ? "-translate-y-1.5 -rotate-45" : ""
              }`}
            />
          </div>
        </button>
      </div>

      {/* Mobile Drawer Menu (390px Viewport Support) */}
      {mobileMenuOpen && (
        <div className="border-b border-[#e6e4f0] dark:border-[#29273c] bg-[#faf9f6] dark:bg-[#0f0e18] px-6 py-6 md:hidden">
          <nav className="flex flex-col space-y-3">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-semibold text-[#11101e] dark:text-white transition-colors hover:text-[#ff4d6d]"
              >
                {l.label}
              </Link>
            ))}
            <div className="pt-4 border-t border-[#e6e4f0] dark:border-[#29273c]">
              <Link
                href="/v2/contact"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex w-full items-center justify-center rounded-full bg-[#11101e] py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#ff4d6d] dark:bg-white dark:text-[#11101e]"
              >
                Contact TwoNode
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
