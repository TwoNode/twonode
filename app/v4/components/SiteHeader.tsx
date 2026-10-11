"use client";

import Link from "next/link";
import { useState } from "react";

export type V4Section = "home" | "story" | "insights" | "industry" | "contact";

export function SiteHeader({ current }: { current: V4Section }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const home = current === "home";

  return (
    <header className="site-header">
      <Link className="brand" href="/v4" aria-label="TwoNode home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="brand-logo"
          src="/logo.svg"
          alt="TwoNode Technologies"
          width={161}
          height={40}
        />
      </Link>
      <button
        className="menu-toggle"
        aria-label="Toggle navigation"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span></span>
        <span></span>
      </button>
      <nav className={open ? "nav open" : "nav"}>
        {home ? (
          <>
            <a href="#approach" onClick={close}>
              Our approach
            </a>
            <a href="#work" onClick={close}>
              Our work
            </a>
          </>
        ) : (
          <>
            <Link href="/v4#approach" onClick={close}>
              Our approach
            </Link>
            <Link href="/v4#work" onClick={close}>
              Our work
            </Link>
          </>
        )}
        <Link
          className={current === "story" ? "active" : undefined}
          href="/v4/our-story"
          onClick={close}
        >
          Our story
        </Link>
        <Link
          className={current === "insights" ? "active" : undefined}
          href="/v4/insights"
          onClick={close}
        >
          Insights
        </Link>
        {home ? (
          <a className="nav-cta" href="#contact" onClick={close}>
            Let&apos;s talk <span>↗</span>
          </a>
        ) : (
          <Link className="nav-cta" href="/v4/contact" onClick={close}>
            Let&apos;s talk <span>↗</span>
          </Link>
        )}
      </nav>
    </header>
  );
}
