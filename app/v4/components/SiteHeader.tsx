"use client";

import Link from "next/link";
import { useState } from "react";

function Brand() {
  return (
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
  );
}

export function SiteHeader({ current }: { current: "home" | "story" }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const home = current === "home";

  return (
    <header className="site-header">
      <Brand />
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
          className={home ? undefined : "active"}
          href="/v4/our-story"
          onClick={close}
        >
          Our story
        </Link>
        {home ? (
          <a className="nav-cta" href="#contact" onClick={close}>
            Let&apos;s talk <span>↗</span>
          </a>
        ) : (
          <a
            className="nav-cta"
            href="mailto:info@twonodetechnologies.com"
            onClick={close}
          >
            Let&apos;s talk <span>↗</span>
          </a>
        )}
      </nav>
    </header>
  );
}
