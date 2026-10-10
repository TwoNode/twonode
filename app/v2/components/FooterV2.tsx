"use client";

import Link from "next/link";

export function FooterV2() {
  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <footer className="relative bg-[#0f0e1a] text-white pt-20 pb-12 overflow-hidden border-t border-white/10">
      {/* Top glowing hairline gradient */}
      <div
        className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-[#ff4d6d]/50 via-60% to-transparent"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        {/* Top Ribbon: Editorial Quote + Live Status Pill */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-12 border-b border-white/10 mb-14">
          <p className="font-(family-name:--font-display) text-xl sm:text-2xl lg:text-3xl italic text-[#ddd9ee] max-w-2xl leading-snug">
            &ldquo;Understand the industry. Build what it needs. Connect the
            people within it.&rdquo;
          </p>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 font-mono text-xs text-[#a8a4c4]">
              <span
                className="h-2 w-2 rounded-full bg-[#0fb5a6] shadow-[0_0_8px_#0fb5a6]"
                style={{ animation: "ndp 1.8s infinite" }}
              />
              <span>All systems active</span>
            </div>
          </div>
        </div>

        {/* 4-Column Grid Architecture */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.6fr_1.1fr_1.1fr_1.2fr] gap-10 sm:gap-12 pb-16 border-b border-white/10">
          {/* Column 1: Brand & Registration */}
          <div>
            <Link
              href="/v2"
              className="inline-flex items-center transition-opacity hover:opacity-90"
              aria-label="TwoNode Technologies"
            >
              <img
                src="/logo.svg"
                alt="TwoNode Technologies"
                className="h-9 w-auto brightness-0 invert"
              />
            </Link>

            <p className="mt-4 text-sm leading-relaxed text-[#9f9bb8] max-w-xs">
              We enter industries, understand how their work actually happens,
              and build the infrastructure, workflows, and convenings their
              ecosystems need to move forward.
            </p>

            <div className="mt-6 space-y-1 font-mono text-xs text-[#797592]">
              <p>TwoNode Technologies Ltd.</p>
              <p>RC NO.: 7742902</p>
              <p>Lagos &bull; Abuja, Nigeria</p>
            </div>
          </div>

          {/* Column 2: Industries & Platforms */}
          <div>
            <h4 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#ff4d6d] mb-5">
              Industries & Work
            </h4>
            <ul className="space-y-3 text-sm text-[#b9b5d2]">
              <li>
                <Link
                  href="/v2/industries/surveying-geospatial"
                  className="inline-flex items-center gap-2 hover:text-white transition-colors"
                >
                  <span>Surveying & Geospatial</span>
                  <span className="font-mono text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#0fb5a6]/20 text-[#2dd4bf]">
                    Active
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href="/surfboard"
                  className="text-xs text-[#9f9bb8] hover:text-white transition-colors pl-3 border-l border-white/10 ml-1"
                >
                  ↳ Surfboard (Cadastral Records)
                </Link>
              </li>
              <li>
                <Link
                  href="/gbc"
                  className="text-xs text-[#9f9bb8] hover:text-white transition-colors pl-3 border-l border-white/10 ml-1"
                >
                  ↳ GBC (Builders Conference)
                </Link>
              </li>
              <li className="pt-2">
                <Link
                  href="/v2/industries/real-estate"
                  className="inline-flex items-center gap-2 hover:text-white transition-colors"
                >
                  <span>Real Estate</span>
                  <span className="font-mono text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#ff4d6d]/20 text-[#ff859d]">
                    Next
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href="/reva"
                  className="text-xs text-[#9f9bb8] hover:text-white transition-colors pl-3 border-l border-white/10 ml-1"
                >
                  ↳ REVA (Title Due Diligence)
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Company & Perspectives */}
          <div>
            <h4 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#ff4d6d] mb-5">
              Perspective
            </h4>
            <ul className="space-y-3 text-sm text-[#b9b5d2]">
              <li>
                <Link href="/v2/our-story" className="hover:text-white transition-colors">
                  Our Story
                </Link>
              </li>
              <li>
                <Link href="/v2/insights" className="hover:text-white transition-colors">
                  Inside TwoNode (Insights)
                </Link>
              </li>
              <li>
                <Link href="/v2/#how-we-build" className="hover:text-white transition-colors">
                  How We Build
                </Link>
              </li>
              <li>
                <Link href="/v2/contact" className="hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Ecosystem & Direct Contact */}
          <div>
            <h4 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#ff4d6d] mb-5">
              Connect
            </h4>
            <p className="text-sm text-[#9f9bb8] leading-relaxed mb-4">
              Have an industry challenge where information and trust break down?
            </p>
            <Link
              href="/v2/contact"
              className="inline-flex items-center gap-2 rounded-full bg-white text-[#11101e] px-4 py-2 text-xs font-bold shadow-sm transition-all hover:bg-[#ff4d6d] hover:text-white mb-4"
            >
              Work with TwoNode →
            </Link>
            <div className="pt-2">
              <a
                href="mailto:info@twonodetechnologies.com"
                className="font-mono text-xs text-[#ff4d6d] hover:underline"
              >
                info@twonodetechnologies.com
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright, Legal, Back to top */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#797592]">
          <p>© {new Date().getFullYear()} TwoNode Technologies. All rights reserved.</p>

          <div className="flex items-center gap-6">
            <Link href="/v2/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/v2/terms" className="hover:text-white transition-colors">
              Terms
            </Link>
            <button
              type="button"
              onClick={scrollToTop}
              className="inline-flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
            >
              <span>Back to top</span>
              <span>↑</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
