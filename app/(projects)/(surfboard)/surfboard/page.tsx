"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { IBM_Plex_Mono } from "next/font/google";
import { useTheme } from "@/hooks/useTheme";
import styles from "./surfboard-landing.module.css";

/** This landing page defaults to light regardless of OS preference — only
 * an explicit prior choice (from this page's toggle, or elsewhere in the
 * site) is respected. */
const THEME_STORAGE_KEY = "twonodes-theme";

/** Headings/body reuse the site-wide Bricolage Grotesque (already loaded by
 * the root layout via --font-bricolage) — only the mono/label accents (QR
 * grid, verification codes) get their own typeface. */
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500"], variable: "--font-plex-mono" });

/** Deterministic seeded pattern (visual only, not a scannable code) — stable across renders rather than re-randomizing. */
function useQrPattern(size = 11) {
  return useMemo(() => {
    let seed = 42;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    const cells: boolean[] = [];
    for (let i = 0; i < size * size; i++) {
      const r = Math.floor(i / size);
      const c = i % size;
      const isFinder = (r < 3 && c < 3) || (r < 3 && c > size - 4) || (r > size - 4 && c < 3);
      cells.push(isFinder ? r === 0 || r === 2 || c === 0 || c === 2 || (r === 1 && c === 1) : rand() > 0.5);
    }
    return cells;
  }, [size]);
}

const PLAN_ICON = (
  <>
    <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
    <path d="M14 2v6h6" />
  </>
);

export default function SurfboardLandingPage() {
  const qrCells = useQrPattern(11);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { theme, setTheme, toggleTheme } = useTheme();

  useEffect(() => {
    // Deferred a tick: ThemeProvider's own mount effect re-derives theme from
    // the class the blocking init script already painted (system preference,
    // for a first-time visitor) and briefly re-asserts it after this runs —
    // waiting until that settles lets this be the final word instead of
    // getting immediately overwritten back to dark.
    const id = setTimeout(() => {
      try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        if (stored !== "light" && stored !== "dark") {
          setTheme("light");
        }
      } catch {
        // localStorage unavailable — leave whatever theme resolved.
      }
    }, 0);
    return () => clearTimeout(id);
  }, [setTheme]);

  return (
    <div className={`${styles.landing} ${plexMono.variable}`}>
      {/* NAV */}
      <nav className={styles.topbar}>
        <div className={`${styles.wrap} ${styles.navRow}`}>
          <div className={styles.brand}>
            <span className={styles.mark}>S</span> Surfboard <span className={styles.beta}>beta</span>
          </div>
          <div className={styles.navLinks}>
            <a href="#how">How it works</a>
            <a href="#verify">Verification</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className={styles.navActions}>
            <button
              type="button"
              onClick={toggleTheme}
              className={styles.themeToggle}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
            <Link href="/surfboard/login" className={`${styles.btn} ${styles.btnWhite}`}>
              Get Started <ArrowRightIcon />
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroBg} />
        <div className={styles.heroDots} />
        <div className={`${styles.wrap} ${styles.heroGrid}`}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>
              <SparkleIcon /> Your survey plan. Secure it, and add more value to it.
            </span>
            <h1 className={styles.headline}>The digital infrastructure for securing your survey plans</h1>
            <p className={styles.sub}>
              Surfboard gives surveyors a trusted digital infrastructure for storing, securing, lodging, and
              verifying survey plans.
            </p>
            <div className={styles.ctaRow}>
              <Link href="/surfboard/login" className={`${styles.btn} ${styles.btnWhite}`}>
                Get Started Now <ArrowRightIcon />
              </Link>
              <Link href="/surfboard/badge" className={`${styles.btn} ${styles.btnGhost}`}>
                View Badge Video
              </Link>
            </div>
          </div>

          <div className={styles.heroVisual} aria-hidden="true">
            <div className={styles.orbitGlow} />
            <svg className={styles.orbitSvg} viewBox="0 0 240 240">
              <circle className={styles.orbitRing} cx="120" cy="120" r="100" />
              <circle className={styles.orbitRing} cx="120" cy="120" r="64" />

              {/* outer ring: surveyor / property owner / financial institutions */}
              <g className={styles.orbitSpinA}>
                <line className={styles.orbitLine} x1="120" y1="120" x2="220" y2="120" />
                <line className={styles.orbitLine} x1="120" y1="120" x2="70" y2="206.6" />
                <line className={styles.orbitLine} x1="120" y1="120" x2="70" y2="33.4" />

                <g className={styles.iconCounter} style={{ transformOrigin: "220px 120px" }}>
                  <circle className={styles.orbitBubble} cx="220" cy="120" r="17" />
                  <g className={styles.orbitIcon} transform="translate(211,111) scale(0.75)">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
                  </g>
                </g>
                <g className={styles.iconCounter} style={{ transformOrigin: "70px 206.6px" }}>
                  <circle className={styles.orbitBubble} cx="70" cy="206.6" r="17" />
                  <g className={styles.orbitIcon} transform="translate(61,198) scale(0.75)">
                    <path d="m3 11 9-8 9 8" />
                    <path d="M5 10v10h14V10" />
                    <path d="M9 20v-6h6v6" />
                  </g>
                </g>
                <g className={styles.iconCounter} style={{ transformOrigin: "70px 33.4px" }}>
                  <circle className={styles.orbitBubble} cx="70" cy="33.4" r="17" />
                  <g className={styles.orbitIcon} transform="translate(61,24.4) scale(0.75)">
                    <rect x="2" y="6" width="20" height="12" rx="2" />
                    <circle cx="12" cy="12" r="3" />
                    <path d="M6 10v.01M18 14v.01" />
                  </g>
                </g>
              </g>

              {/* inner ring: verify / lodge / secure */}
              <g className={styles.orbitSpinB}>
                <line className={styles.orbitLine} x1="120" y1="120" x2="152" y2="175.4" />
                <line className={styles.orbitLine} x1="120" y1="120" x2="56" y2="120" />
                <line className={styles.orbitLine} x1="120" y1="120" x2="152" y2="64.6" />

                <g className={styles.iconCounter} style={{ transformOrigin: "152px 175.4px" }}>
                  <circle className={styles.orbitBubble} cx="152" cy="175.4" r="13" />
                  <g className={styles.orbitIcon} transform="translate(145.4,169.1) scale(0.55)">
                    <path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z" />
                    <path d="m9 12 2 2 4-4" />
                  </g>
                </g>
                <g className={styles.iconCounter} style={{ transformOrigin: "56px 120px" }}>
                  <circle className={styles.orbitBubble} cx="56" cy="120" r="13" />
                  <g className={styles.orbitIcon} transform="translate(49.4,113.4) scale(0.55)">
                    <path d="M22 2 11 13" />
                    <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
                  </g>
                </g>
                <g className={styles.iconCounter} style={{ transformOrigin: "152px 64.6px" }}>
                  <circle className={styles.orbitBubble} cx="152" cy="64.6" r="13" />
                  <g className={styles.orbitIcon} transform="translate(145.4,58.3) scale(0.55)">
                    <rect x="4" y="11" width="16" height="9" rx="2" />
                    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                  </g>
                </g>
              </g>

              {/* core: MDA (institution mark) + Surfboard (S mark) */}
              <g transform="translate(76,100)">
                <rect className={styles.orbitCoreBadge} x="0" y="0" width="40" height="40" rx="12" />
                <g className={styles.orbitCoreIcon} transform="translate(9,10) scale(0.86)">
                  <path d="M3 21h18" />
                  <path d="M5 21V9M9 21V9M15 21V9M19 21V9" />
                  <path d="m3 9 9-6 9 6" />
                </g>
              </g>
              <g transform="translate(124,100)">
                <rect className={styles.orbitCoreBadge} x="0" y="0" width="40" height="40" rx="12" />
                <text x="20" y="28" textAnchor="middle" fontFamily="var(--font-bricolage), sans-serif" fontWeight="800" fontSize="20" className={styles.orbitCoreS}>
                  S
                </text>
              </g>
            </svg>
          </div>
        </div>
      </section>

      {/* VALUE BAND */}
      <section className={styles.valueBand}>
        <div className={`${styles.wrap} ${styles.valueGrid}`}>
          <div className={styles.vProp}>
            <span className={styles.vNum}>01</span>
            <h3>Stand out</h3>
          </div>
          <div className={styles.vProp}>
            <span className={styles.vNum}>02</span>
            <h3>Build trust</h3>
          </div>
          <div className={styles.vProp}>
            <span className={styles.vNum}>03</span>
            <h3>Leave a lasting impression on your clients</h3>
          </div>
        </div>
      </section>

      {/* PILLARS */}
      <section className={styles.section}>
        <div className={styles.wrap}>
          <span className={styles.kicker}>The foundation</span>
          <h2 className={styles.h2} style={{ marginBottom: 8 }}>
            Four things every plan gets
          </h2>
        </div>
        <div className={styles.wrap} style={{ marginTop: 36 }}>
          <div className={styles.pillarList}>
            <div className={styles.pillarItem}>
              <span className={styles.pillarNum}>01</span>
              <h3>Store</h3>
              <p>Every survey plan lives in one durable, searchable record.</p>
            </div>
            <div className={styles.pillarItem}>
              <span className={styles.pillarNum}>02</span>
              <h3>Secure</h3>
              <p>Tamper-evident records with a full audit trail from upload to lodgement.</p>
            </div>
            <div className={styles.pillarItem}>
              <span className={styles.pillarNum}>03</span>
              <h3>Lodge</h3>
              <p>Submit straight into the government&apos;s charting and certification pipeline.</p>
            </div>
            <div className={styles.pillarItem}>
              <span className={styles.pillarNum}>04</span>
              <h3>Verify</h3>
              <p>Anyone can confirm authenticity in seconds with a single scan.</p>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT IS A SURVEY PLAN */}
      <section className={styles.section} style={{ background: "var(--sfl-card)" }}>
        <div className={`${styles.wrap} ${styles.center}`}>
          <span className={styles.kicker}>The basics</span>
          <h2 className={styles.h2}>What is a Survey Plan really?</h2>
        </div>
        <div className={`${styles.wrap} ${styles.defList}`}>
          <div>
            <div className={styles.defNum}>1</div>
            <p>It defines boundaries</p>
          </div>
          <div>
            <div className={styles.defNum}>2</div>
            <p>Supports ownership claims</p>
          </div>
          <div>
            <div className={styles.defNum}>3</div>
            <p>And lays the foundation for everything that follows</p>
          </div>
        </div>
      </section>

      {/* CONNECTED TO GOVERNMENT */}
      <section className={styles.section}>
        <div className={styles.wrap}>
          <div className={styles.connectCard}>
            <div>
              <span className={styles.kicker}>Government integration</span>
              <h2>Connected directly to the Office of the State Surveyor-General</h2>
              <p>
                Every submission moves straight into the real Charting, SURCON, Records, and Accounts pipeline, with
                no separate portal, no re-keying data, and no lost paperwork between systems.
              </p>
            </div>
            <div className={styles.nodePair}>
              <div className={styles.node}>
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M4 12h16M4 12l4-4M4 12l4 4" stroke="#233dff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className={styles.dash} />
              <div className={`${styles.node} ${styles.nodeRound}`}>
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M12 2l7 4v6c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-4z" stroke="#000b3d" strokeWidth="1.6" fill="#000b3d10" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section id="how" className={styles.section} style={{ background: "var(--sfl-card)" }}>
        <div className={`${styles.wrap} ${styles.center}`}>
          <span className={styles.kicker}>The process</span>
          <h2 className={styles.h2}>From upload to lodgement</h2>
          <p className={styles.lead}>One clear path, five checkpoints, full visibility throughout.</p>
        </div>
        <div className={styles.wrap} style={{ position: "relative" }}>
          <div className={styles.stepRail} />
          <div className={styles.steps}>
            {PROCESS_STEPS.map((s) => (
              <div className={styles.step} key={s.label}>
                <div className={styles.stepIcon}>{s.icon}</div>
                <div className={styles.stepLabel}>{s.label}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ECOSYSTEM (sticky) */}
      <div className={styles.cycleStickyWrap}>
        <section className={styles.cycleSection}>
          <div className={styles.cycleContent}>
            <div className={`${styles.wrap} ${styles.center}`}>
              <span className={styles.kicker}>The ecosystem</span>
              <h2 className={styles.h2}>The survey plan is the core of the ecosystem</h2>
              <p className={styles.lead}>Everyone who touches a property transaction relies on the same secured record.</p>
            </div>
            <div className={styles.cycleWrap}>
              <div className={styles.ring} />
              <div className={styles.cycleCenter}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  {PLAN_ICON}
                  <path d="M9 13h6M9 17h6" />
                </svg>
                <span>Survey Plan</span>
              </div>
              <div className={styles.cycleNode} style={{ left: "50%", top: "4%" }}>
                <div className={styles.bubble}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
                  </svg>
                </div>
                <span>Surveyor</span>
              </div>
              <div className={styles.cycleNode} style={{ left: "96%", top: "50%" }}>
                <div className={styles.bubble}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 21h18" />
                    <path d="M5 21V9M9 21V9M15 21V9M19 21V9" />
                    <path d="m3 9 9-6 9 6" />
                  </svg>
                </div>
                <span>Government</span>
              </div>
              <div className={styles.cycleNode} style={{ left: "50%", top: "96%" }}>
                <div className={styles.bubble}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m3 11 9-8 9 8" />
                    <path d="M5 10v10h14V10" />
                    <path d="M9 20v-6h6v6" />
                  </svg>
                </div>
                <span>Property Owner</span>
              </div>
              <div className={styles.cycleNode} style={{ left: "4%", top: "50%" }}>
                <div className={styles.bubble}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="6" width="20" height="12" rx="2" />
                    <circle cx="12" cy="12" r="3" />
                    <path d="M6 10v.01M18 14v.01" />
                  </svg>
                </div>
                <span>Financial Institutions</span>
              </div>
            </div>
            <p className={`${styles.wrap} ${styles.center} ${styles.lead}`} style={{ marginTop: 52 }}>
              Now it&apos;s secured, verifiable, and more connected, enabling fast property transactions.
            </p>
          </div>
        </section>
      </div>

      {/* VERIFICATION */}
      <section id="verify" className={styles.section} style={{ background: "var(--sfl-card)" }}>
        <div className={`${styles.wrap} ${styles.center}`}>
          <span className={styles.kicker}>Verification</span>
          <h2 className={styles.h2}>One scan secures your client&apos;s trust in your work</h2>
          <p className={styles.lead}>
            Secure, verify, access the certificate of deposit, and navigate to the plan, all from a single QR code.
          </p>
        </div>
        <div className={`${styles.wrap} ${styles.twoCol}`}>
          <div className={styles.qrCard}>
            <div className={styles.qrBox}>
              <div className={styles.qrGrid}>
                {qrCells.map((on, i) => (
                  <i key={i} className={on ? "" : styles.off} />
                ))}
              </div>
            </div>
            <div className={styles.planNum}>PLAN NO. SP/2024/0113</div>
            <div className={styles.scanHint}>Scan to verify authenticity</div>
          </div>
          <div className={styles.verifyCard}>
            <div className={styles.vHead}>
              <div className={styles.vBadge}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <div>
                <b>Verified authentic</b>
                <small>Checked against the Surfboard registry</small>
              </div>
            </div>
            <div className={styles.vRows}>
              <div className={styles.vRow}>
                <span>Plan Number</span>
                <span>SP/2024/0113</span>
              </div>
              <div className={styles.vRow}>
                <span>LGA</span>
                <span>Ikeja</span>
              </div>
              <div className={styles.vRow}>
                <span>Status</span>
                <span style={{ color: "var(--sfl-success)" }}>Certificate of Deposit issued</span>
              </div>
            </div>
            <button className={styles.mapBtn} type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>{" "}
              View on Google Maps
            </button>
          </div>
        </div>
      </section>

      {/* QR EARNINGS */}
      <section id="qr-earnings" className={styles.section}>
        <div className={`${styles.wrap} ${styles.center}`}>
          <span className={styles.kicker}>QR earnings</span>
          <h2 className={styles.h2}>Every scan pays you back</h2>
          <p className={styles.lead}>Verification isn&apos;t just trust: it&apos;s a passive earnings stream for every surveyor on Surfboard.</p>
        </div>
        <div className={styles.financeCard}>
          <div className={styles.frowTop}>
            <span className={styles.fLabel}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v3" />
                <path d="M3 7v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2H5a2 2 0 0 1-2-2Z" />
                <circle cx="17" cy="14" r="1.4" />
              </svg>{" "}
              QR Earnings
            </span>
            <span className={styles.fPill}>Live balance</span>
          </div>
          <div className={`${styles.fBalance} ${styles.mono}`}>₦42,500</div>
          <p className={styles.fSub}>Available for payout</p>
          <div className={styles.fList}>
            <div className={styles.fItem}>
              <div className={styles.fItemLeft}>
                <div className={`${styles.fIcon} ${styles.fIconUp}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 17 17 7" />
                    <path d="M7 7h10v10" />
                  </svg>
                </div>
                QR scan: SP/2024/0113
              </div>
              <div className={`${styles.fAmount} ${styles.fAmountPos} ${styles.mono}`}>+₦500</div>
            </div>
            <div className={styles.fItem}>
              <div className={styles.fItemLeft}>
                <div className={`${styles.fIcon} ${styles.fIconUp}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 17 17 7" />
                    <path d="M7 7h10v10" />
                  </svg>
                </div>
                QR scan: SP/2024/0098
              </div>
              <div className={`${styles.fAmount} ${styles.fAmountPos} ${styles.mono}`}>+₦500</div>
            </div>
            <div className={styles.fItem}>
              <div className={styles.fItemLeft}>
                <div className={`${styles.fIcon} ${styles.fIconDown}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m7 7 10 10" />
                    <path d="M17 7v10H7" />
                  </svg>
                </div>
                Payout to bank account
              </div>
              <div className={`${styles.fAmount} ${styles.mono}`} style={{ color: "#ffffffcc" }}>
                -₦4,000
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DASHBOARD PREVIEW */}
      <section className={styles.section} style={{ background: "var(--sfl-card)" }}>
        <div className={`${styles.wrap} ${styles.center}`}>
          <span className={styles.kicker}>Your dashboard</span>
          <h2 className={styles.h2}>Everything in one dashboard</h2>
        </div>
        <div className={`${styles.wrap} ${styles.dashGrid}`}>
          <div className={styles.statCard}>
            <div className={styles.statIcn}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                {PLAN_ICON}
                <path d="m9 15 2 2 4-4" />
              </svg>
            </div>
            <div>
              <div className={styles.statLbl}>Your Certificate of Deposits</div>
              <div className={styles.statNum}>128</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcn}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <path d="M14 14h3v3h-3zM19 14h2v2h-2zM14 19h2v2h-2zM19 19h2v2h-2z" />
              </svg>
            </div>
            <div>
              <div className={styles.statLbl}>Your QR Code Activities</div>
              <div className={styles.statNum}>312</div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className={styles.section}>
        <div className={styles.wrap}>
          <span className={styles.kicker}>FAQ</span>
          <h2 className={styles.h2} style={{ marginBottom: 32 }}>
            Frequently asked
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {FAQS.map((item, i) => (
              <FaqItem key={item.q} q={item.q} a={item.a} open={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? null : i)} />
            ))}
          </div>
        </div>
      </section>

      {/* CLOSING */}
      <section className={`${styles.section} ${styles.closing}`}>
        <div className={styles.wrap}>
          <h2>Surfboard: The digital infrastructure for secured survey plans</h2>
          <p>Now it&apos;s secured, verifiable, and more connected, enabling fast property transactions.</p>
          <div style={{ marginTop: 22 }}>
            <Link href="/surfboard/login" className={`${styles.btn} ${styles.btnWhite}`}>
              Get Started Now
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerDots} />
        <div className={`${styles.wrap} ${styles.footTop}`}>
          <div className={styles.footBrand}>
            <div className={styles.brand}>
              <span className={styles.mark}>S</span> Surfboard
            </div>
            <p>
              The digital infrastructure for securing your survey plans, built for surveyors, trusted by government,
              and verifiable by anyone.
            </p>
            <Link href="/surfboard/login" className={styles.footCta}>
              Get started free →
            </Link>
          </div>
          <div className={styles.footCol}>
            <h4>Product</h4>
            <ul>
              <li>
                <a href="#how">How it works</a>
              </li>
              <li>
                <a href="#verify">Verification</a>
              </li>
              <li>
                <a href="#qr-earnings">QR Earnings</a>
              </li>
              <li>
                <a href="#faq">FAQ</a>
              </li>
            </ul>
          </div>
          <div className={styles.footCol}>
            <h4>Company</h4>
            <ul>
              <li>
                <a href="https://www.twonodetechnologies.com" target="_blank" rel="noopener noreferrer">
                  TwoNode Technologies
                </a>
              </li>
              <li>
                <Link href="/surfboard/badge">Badge Video</Link>
              </li>
              <li>
                <a href="mailto:info@twonodetechnologies.com">Contact</a>
              </li>
            </ul>
          </div>
          <div className={styles.footCol}>
            <h4>Legal</h4>
            <ul>
              <li>
                <a href="#">Privacy Policy</a>
              </li>
              <li>
                <a href="#">Terms of Service</a>
              </li>
            </ul>
          </div>
        </div>
        <div className={`${styles.wrap} ${styles.footBottom}`}>
          <span>© {new Date().getFullYear()} Surfboard, a TwoNode Product. All rights reserved.</span>
          <div className={styles.footSocial}>
            <a href="#" aria-label="X / Twitter">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.9 2h3.3l-7.2 8.2L23.5 22h-6.6l-5.2-6.8L5.7 22H2.4l7.7-8.8L1.5 2h6.8l4.7 6.2L18.9 2Zm-1.2 18h1.8L7.4 4h-2l12.3 16Z" />
              </svg>
            </a>
            <a href="#" aria-label="LinkedIn">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3zM10 9h3.8v1.7h.05c.53-1 1.83-2 3.77-2 4.03 0 4.78 2.5 4.78 5.8V21h-4v-5.7c0-1.36-.03-3.1-1.9-3.1-1.9 0-2.2 1.48-2.2 3v5.8h-4z" />
              </svg>
            </a>
            <a href="#" aria-label="Instagram">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.2" cy="6.8" r="1" />
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

const PROCESS_STEPS = [
  {
    label: "STEP 1",
    title: "Upload",
    desc: "CSV or manual pillar entry, validated on the way in.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v12" />
        <path d="m7 8 5-5 5 5" />
        <path d="M5 21h14" />
      </svg>
    ),
  },
  {
    label: "STEP 2",
    title: "Review",
    desc: "Geometry, boundaries, and attributes checked before it moves on.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="4" width="12" height="17" rx="2" />
        <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
        <path d="m9 13 2 2 4-4" />
      </svg>
    ),
  },
  {
    label: "STEP 3",
    title: "Submit",
    desc: "Sent into the Certificate of Deposit queue for processing.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 2 11 13" />
        <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
      </svg>
    ),
  },
  {
    label: "STEP 4",
    title: "Track",
    desc: "Live status across Charting, SURCON, Records, and Accounts.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="5" cy="18" r="2.5" />
        <circle cx="19" cy="6" r="2.5" />
        <path d="M7.5 18H15a4 4 0 0 0 4-4a4 4 0 0 0-4-4H9a4 4 0 0 1-4-4" />
      </svg>
    ),
  },
  {
    label: "STEP 5",
    title: "Lodge",
    desc: "Certified, QR-secured, and ready to stand up anywhere.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="m8.5 12.5 2.3 2.3 4.7-5" />
      </svg>
    ),
  },
];

const FAQS = [
  { q: "Can I upload survey plans outside Lagos?", a: "Yes, you can upload survey plans for anywhere in the world." },
  {
    q: "Is every QR Code unique to a survey plan?",
    a: "Yes, each survey record automatically generates a unique QR Code for secure identification.",
  },
  {
    q: "When I scan the QR Code, will it show the location of the survey plan?",
    a: "Yes, scanning the QR Code displays the location of the survey plan on an interactive map, along with additional details about the record.",
  },
  {
    q: "Can I navigate to the location of the survey plan?",
    a: "Yes, simply click 'View on Google Maps' to get directions to the exact location.",
  },
  {
    q: "What is the required CSV file format?",
    a: "Your file should have the following columns: Column 1: Pillar No, Column 2: X coordinate, Column 3: Y coordinate.",
  },
  { q: "Can I edit a record after upload?", a: "Absolutely! You can click 'Edit' to make and save any necessary changes." },
  {
    q: "Can Surfboard auto-detect wards and LGAs?",
    a: "Yes. Given polygon geometry, Surfboard intersects against a Nigeria wards dataset to return ward, LCDA/LGA, and state metadata.",
  },
  {
    q: "Do you support big CSV files?",
    a: "Yes. Large files are handled with streaming parsers and server-side validation; you'll see progress and row-level errors.",
  },
  { q: "Is geometry required?", a: "No. You can upload pillars only, Surfboard generates and validates polygons for you." },
];

function FaqItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  return (
    <div
      style={{
        borderRadius: "var(--sfl-radius-md)",
        border: "1px solid var(--sfl-border)",
        background: "var(--sfl-card)",
        padding: "16px 18px",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          display: "flex",
          width: "100%",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          padding: 0,
          font: "inherit",
          color: "var(--sfl-ink)",
        }}
      >
        <span style={{ fontSize: 14.5, fontWeight: 600 }}>{q}</span>
        <ArrowRightIcon />
      </button>
      {open && (
        <p style={{ marginTop: 10, marginBottom: 0, fontSize: 14, color: "var(--sfl-muted)", lineHeight: 1.55 }}>{a}</p>
      )}
    </div>
  );
}
