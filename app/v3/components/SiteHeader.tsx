"use client";

import Link from "next/link";
import { useState } from "react";

function Brand() {
  return (
    <Link className="brand" href="/v3" aria-label="TwoNode home">
      <span className="brand-mark">
        <i></i>
        <i></i>
      </span>
      <span>
        TwoNode<span className="brand-light"> Technologies</span>
      </span>
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
            <Link href="/v3#approach" onClick={close}>
              Our approach
            </Link>
            <Link href="/v3#work" onClick={close}>
              Our work
            </Link>
          </>
        )}
        <Link
          className={home ? undefined : "active"}
          href="/v3/our-story"
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
