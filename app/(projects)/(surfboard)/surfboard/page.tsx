"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Waves,
  Map,
  FileSpreadsheet,
  ShieldCheck,
  Upload,
  Landmark,
  Database,
  ZoomIn,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Search,
  Boxes,
  Layers,
  Ruler,
  Compass,
  FileDown,
} from "lucide-react";

/**
 * Surfboard Landing Page — focused on: upload plans, view & analyze on map.
 * - TailwindCSS styling
 * - Framer Motion micro-interactions
 * - Lucide icons
 * - Single-file, drop-in page component
 * - Accessible semantics + responsive layout
 *
 * Notes for integration:
 * - Replace placeholder images with app screenshots (hero/map/analytics)
 * - Wire the demo search handler to your real action: `searchReferencePlanNumbers`
 * - Adjust nav links to match your routes
 */

const SURF_COLORS = {
  bg: {
    base: "#0A0F1F",
    elevate: "#0F1733",
    card: "#1A223F",
  },
  brand: {
    primary: "#38BDF8",
    secondary: "#22D3EE",
    accent: "#60A5FA",
  },
  text: {
    base: "#F8FAFC",
    muted: "#A5B4C4",
  },
  status: {
    success: "#34D399",
    warning: "#FBBF24",
    error: "#F87171",
    info: "#60A5FA",
  },
  ring: "#22D3EE",
};

// Static gradient (no dynamic Tailwind classes)
const gradientBG =
  "bg-[radial-gradient(1200px_600px_at_50%_-20%,rgba(56,189,248,0.20),rgba(10,15,31,0))]";

// Helper for semi-transparent badge backgrounds
function hexToRgba(hex: string, alpha = 1) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function SurfboardLandingPage() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<
    { planNumber: string; title: string; lga: string; status: string }[]
  >([]);

  const features = useMemo(
    () => [
      {
        title: "CSV Upload & Validation",
        desc: "Import pillars/plans, auto-validate fields, and catch errors before they ship.",
        icon: FileSpreadsheet,
      },
      {
        title: "Polygon Generation",
        desc: "Turn ordered pillars into clean polygons; snap, close, and simplify geometry.",
        icon: Ruler,
      },
      {
        title: "Nigeria Boundary Lookup",
        desc: "Instant ward/LCDA/LGA/state detection using spatial intersects.",
        icon: Landmark,
      },
      {
        title: "Interactive Map Analysis",
        desc: "Pan, zoom, toggle layers, measure, and overlay pillars/polygons with boundary metadata.",
        icon: Layers,
      },
      {
        title: "Facilitator Console",
        desc: "Track certificates, statuses, and pending actions in one place.",
        icon: Boxes,
      },
    ],
    []
  );

  const steps = [
    { title: "Upload", desc: "Drop CSV or fill the smart form.", icon: Upload },
    { title: "Validate", desc: "Run schema & geometry checks.", icon: ShieldCheck },
    { title: "Build Geometry", desc: "Generate polygons from pillars.", icon: Compass },
    { title: "Locate", desc: "Ward/LCDA/LGA/state intersects.", icon: Map },
    { title: "Analyse", desc: "Review & analyze plans on the map.", icon: ZoomIn },
  ];

  async function onSearchDemo(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // TODO: Replace this mock with a call to your server action:
    // const items = await searchReferencePlanNumbers(q)
    // setResults(items)
    await new Promise((r) => setTimeout(r, 700));
    const mock = [
      { planNumber: "OD/AKR/1234", title: "Okuta Layout – Block B/12", lga: "Akure South", status: "PENDING" },
      { planNumber: "OD/AKR/5678", title: "Arakale Close – Plot 4", lga: "Akure South", status: "APPROVED" },
    ].filter((x) => x.planNumber.toLowerCase().includes(q.toLowerCase()));
    setResults(mock);
    setLoading(false);
  }

  // Solid, accessible presets (avoid dynamic Tailwind)
  const cardStyle =
    "rounded-2xl border border-white/10 bg-white/[0.03] p-6 ring-1 ring-white/[0.04] hover:bg-white/[0.05] transition-colors";
  const inputStyle =
    "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400";

  return (
    <div
      className={`min-h-screen text-white/90 ${gradientBG}`}
      style={{ backgroundColor: SURF_COLORS.bg.base }}
    >
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-white/5 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="#" className="group inline-flex items-center gap-2">
              <Waves className="h-6 w-6 text-cyan-400 group-hover:rotate-6 transition" />
              <span className="font-semibold tracking-tight">Surfboard</span>
              <span className="ml-2 rounded-full bg-cyan-400/10 px-2.5 py-0.5 text-xs text-cyan-300 ring-1 ring-cyan-400/20">
                beta
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm text-white/80">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#demo" className="hover:text-white transition-colors">Demo</a>
              <a href="#how" className="hover:text-white transition-colors">How it works</a>
              <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            </nav>
            <div className="flex items-center gap-3">
              <Link href="/surfboard/login" className="text-sm text-white/80 hover:text-white">Sign in</Link>
              <Link
                href="/surfboard/dashboard"
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 hover:opacity-90"
                style={{ backgroundColor: SURF_COLORS.brand.primary, color: "#0b0f19" }}
              >
                Launch app <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 lg:py-24">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
              <Sparkles className="h-3.5 w-3.5" /> New: Interactive map analysis & ward/LGA auto-detection
            </div>
            <h1 className="mt-5 text-balance text-4xl font-semibold leading-tight text-white sm:text-5xl">
              Survey plan intelligence for Nigeria — <span className="text-cyan-300">fast</span>,
              <span className="text-sky-300"> accurate</span>, <span className="text-blue-300">auditable</span>.
            </h1>
            <p className="mt-4 max-w-xl text-pretty text-slate-300">
              Upload pillar coordinates, generate polygons, detect boundaries (Ward/LCDA/LGA/State), and organize and
              analyze plans directly on the map — all in one streamlined workflow.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/surfboard/login"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                Try Surfboard <Search className="h-4 w-4" />
              </Link>
              <Link
                href="/surfboard/login"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-white/90 hover:bg-white/5"
              >
                Sign In <FileDown className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-6 flex items-center gap-5 text-xs text-slate-400">
              <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4"/> Validation checks</span>
              <span className="inline-flex items-center gap-2"><Layers className="h-4 w-4"/> PostGIS-ready</span>
              <span className="inline-flex items-center gap-2"><Map className="h-4 w-4"/> Interactive map</span>
            </div>
          </motion.div>

          <motion.div className="relative" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
            {/* Replace with a product screenshot */}
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-sky-900/30 via-cyan-900/20 to-blue-900/30 shadow-2xl">
              <div className="absolute inset-0 grid place-items-center">
                <Map className="h-24 w-24 opacity-60" />
              </div>
              <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-black/40 px-3 py-1 text-xs text-white/80 ring-1 ring-white/10">
                <ZoomIn className="h-3.5 w-3.5" /> Map preview
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* TRUST / METRICS */}
      <section aria-label="stats" className="border-y border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 sm:grid-cols-4 sm:px-6">
          {[
            { k: "Wards covered", v: "8800+" },
            { k: "LCDAs/LGAs", v: "770+" },
            { k: "Avg. upload speed", v: "~2.4s" },
            { k: "Validation rules", v: "40+" },
          ].map((s) => (
            <div key={s.k} className="rounded-xl bg-white/5 p-4 text-center ring-1 ring-white/10">
              <div className="text-2xl font-semibold text-white">{s.v}</div>
              <div className="mt-1 text-xs text-slate-400">{s.k}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold sm:text-4xl">Built for surveyors and land admins</h2>
            <p className="mt-3 text-slate-300">Everything you need from CSV to certificate in one flow.</p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.35 }}
                className={cardStyle}
              >
                <div className="mb-3 inline-flex rounded-lg bg-cyan-400/15 p-2 ring-1 ring-cyan-400/25">
                  <f.icon className="h-5 w-5 text-cyan-300" />
                </div>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-slate-300">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold sm:text-4xl">From CSV to certificate</h2>
            <p className="mt-2 text-slate-300">A minimal, auditable pipeline that just works.</p>
          </div>

          <ol className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-5">
            {steps.map((s) => (
              <li key={s.title} className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
                <div className="mx-auto mb-2 inline-flex rounded-lg bg-white/5 p-2 ring-1 ring-white/10">
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="text-sm font-medium">{s.title}</div>
                <div className="mt-1 text-xs text-slate-400">{s.desc}</div>
              </li>
            ))}
          </ol>

          <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-emerald-200">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none" />
              <p className="text-sm">
                Surfboard enforces scoped queries and geometry checks so unscoped operations never leak data — pair with
                your existing RLS or keep app-level scoping only.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-2xl font-semibold">Frequently asked</h2>
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            <FAQ
              q="Can Surfboard auto-detect wards and LGAs?"
              a="Yes. Given polygon geometry, Surfboard intersects against a Nigeria wards dataset to return ward, LCDA/LGA, and state metadata."
            />
            <FAQ
              q="Do you support big CSV files?"
              a="Yes. Large files are handled with streaming parsers and server-side validation; you'll see progress and row-level errors."
            />
            <FAQ q="Is geometry required?" a="No. You can upload pillars only — Surfboard generates and validates polygons for you." />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-y border-white/5 bg-gradient-to-br from-cyan-500/10 via-sky-500/10 to-blue-500/10 py-16">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
          <h2 className="text-balance text-3xl font-semibold sm:text-4xl">Ready to ship accurate survey plans?</h2>
          <p className="mx-auto mt-2 max-w-2xl text-slate-300">
            Start with a CSV, end with clean geometry, boundary metadata, and audit-ready records.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/app/surfboard" className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black hover:opacity-90">
              Launch Surfboard
            </Link>
            <Link href="/surfboard/login" className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-white/90 hover:bg-white/5">
              Sign Up
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-transparent py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="inline-flex items-center gap-2 text-sm text-white/80">
              <Waves className="h-4 w-4" /> Surfboard by
              <a href="https://twonode.tech" target="_blank" rel="noopener noreferrer" className="text-white/90 hover:text-white">
                TwoNode Technologies
              </a>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-5 text-xs text-white/80">
              <a href="#features" className="hover:text-white">Features</a>
              <a href="#demo" className="hover:text-white">Demo</a>
              <a href="#how" className="hover:text-white">How it works</a>
              <a href="#faq" className="hover:text-white">FAQ</a>
            </nav>
          </div>
          <p className="mt-6 text-center text-xs text-slate-400">© {new Date().getFullYear()} TwoNode Technologies. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-xl border border-white/10 bg-white/[0.03] p-4 open:bg-white/[0.05]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
        <span className="text-sm font-medium">{q}</span>
        <ArrowRight className="h-4 w-4 transition group-open:rotate-90" />
      </summary>
      <p className="mt-2 text-sm text-slate-300">{a}</p>
    </details>
  );
}
