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
    {
      title: "Smart Form",
      desc: "Guided form for survey plan uploads, CSV import, map preview, and attribute entry.",
      icon: FileSpreadsheet,
    },
    {
      title: "Survey Plan Viewer",
      desc: "Interactive map viewer for visualizing, searching, and querying survey plans and parcel boundaries.",
      icon: Map,
    },
    {
      title: "Dashboard",
      desc: "Central hub for managing plans, viewing recent activity, and accessing analytics.",
      icon: Database,
    },
    {
      title: "SP-Code Verification",
      desc: "Protects survey plans with unique QR codes for public verification, ensuring authenticity.",
      icon: CheckCircle2,
    },
  ];

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
              <Image
                src="/surfboard/surf_logo.svg"
                alt="Surfboard"
                width={64}
                height={64}
              />
              <span className="font-semibold tracking-tight">Surfboard</span>
              <span className="ml-2 rounded-full bg-cyan-400/10 px-2.5 py-0.5 text-xs text-cyan-300 ring-1 ring-cyan-400/20">
                beta
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm text-white/80">
              <Link
                href="#features"
                className="hover:text-white transition-colors"
              >
                Features
              </Link>
              <Link href="#how" className="hover:text-white transition-colors">
                How it works
              </Link>
              <Link href="#faq" className="hover:text-white transition-colors">
                FAQ
              </Link>
              <Link href="/surfboard/badge" className="hover:text-white transition-colors">
                Badge Video
              </Link>
            </nav>
            <div className="flex items-center gap-3">
              <Link
                href="/surfboard/login"
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 hover:opacity-90"
                style={{
                  backgroundColor: SURF_COLORS.brand.primary,
                  color: "#0b0f19",
                }}
              >
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
              <Sparkles className="h-3.5 w-3.5" /> New: Interactive map analysis
              & ward/LGA auto-detection
            </div>
            <h1 className="mt-5 text-balance text-4xl font-semibold leading-tight text-white sm:text-5xl">
              Surfboard: Geospatial Intelligence for Survey Plans
            </h1>
            <p className="mt-4 max-w-xl text-pretty text-slate-300">
              Unlock the value of cadastral and geospatial data. Surfboard
              empowers surveyors, planners, and land administrators with
              actionable insights and structured land intelligence.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/surfboard/login"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                Get Started Now <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/surfboard/badge"
                className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                View Badge Video
              </Link>
            </div>
            <div className="mt-6 flex items-center gap-5 text-xs text-slate-400">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> Validation checks
              </span>
              <span className="inline-flex items-center gap-2">
                <Layers className="h-4 w-4" /> GIS-ready
              </span>
              <span className="inline-flex items-center gap-2">
                <Map className="h-4 w-4" /> Interactive map
              </span>
            </div>
          </motion.div>

          <motion.div
            className="relative"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            {/* Replace with a product screenshot */}
            <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl border border-white/10 bg-linear-to-br from-sky-900/30 via-cyan-900/20 to-blue-900/30 shadow-2xl">
              <div className="absolute inset-0 grid place-items-center">
                <Image
                  src="/surfboard/map_screenshot.png"
                  alt="Map Preview"
                  className="h-[65%] w-[85%] opacity-90"
                  width={100}
                  height={100}
                />
              </div>
              <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-black/40 px-3 py-1 text-xs text-white/80 ring-1 ring-white/10">
                <ZoomIn className="h-3.5 w-3.5" /> Map preview
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* TRUST / METRICS */}
      {/* <section
        aria-label="stats"
        className="border-y border-white/5 bg-linear-to-b from-white/[0.02] to-transparent"
      >
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 sm:grid-cols-4 sm:px-6">
          {[
            { k: "Wards covered", v: "8800+" },
            { k: "LCDAs/LGAs", v: "770+" },
            { k: "Avg. upload speed", v: "~2.4s" },
            { k: "Validation rules", v: "40+" },
          ].map((s) => (
            <div
              key={s.k}
              className="rounded-xl bg-white/5 p-4 text-center ring-1 ring-white/10"
            >
              <div className="text-2xl font-semibold text-white">{s.v}</div>
              <div className="mt-1 text-xs text-slate-400">{s.k}</div>
            </div>
          ))}
        </div>
      </section> */}

      {/* FEATURES */}
      <section id="features" className="relative py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold sm:text-4xl">
              Built for surveyors and land admins
            </h2>
            <p className="mt-3 text-slate-300">
              Everything you need from CSV to certificate in one flow.
            </p>
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
            <h2 className="text-3xl font-semibold sm:text-4xl">
              From CSV to certificate
            </h2>
            <p className="mt-2 text-slate-300">
              A minimal, auditable pipeline that just works.
            </p>
          </div>

          <ol className="mx-auto mt-12 center justify-center flex max-w-5xl flex-wrap gap-6">
            {steps.map((s, index) => (
              <li
                key={s.title}
                className="group basis-1/4 min-w-50 relative overflow-hidden rounded-2xl border border-white/10 bg-linear-to-br from-white/5 to-white/2 p-5 text-center transition-all duration-300 hover:border-white/20 hover:shadow-lg hover:shadow-white/5"
              >
                <div className="absolute -right-6 -top-6 text-7xl font-bold text-white/5 transition-all duration-300 group-hover:text-white/10">
                  {index + 1}
                </div>
                <div className="relative z-10 mx-auto mb-4 inline-flex rounded-xl bg-linear-to-br from-emerald-500/20 to-emerald-600/20 p-3 ring-1 ring-white/10 ring-offset-2 ring-offset-slate-900">
                  <s.icon className="h-6 w-6 text-emerald-400" />
                </div>
                <h3 className="mb-2 text-base font-semibold text-white">
                  {s.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-300">
                  {s.desc}
                </p>
              </li>
            ))}
          </ol>

          <div className="mx-auto mt-16 max-w-4xl rounded-2xl border border-emerald-400/20 bg-linear-to-r from-emerald-500/5 to-emerald-600/5 p-6 backdrop-blur-sm">
            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="mb-2 text-lg font-medium text-white">
                  Empowering Land Professionals
                </h3>
                <p className="text-sm leading-relaxed text-slate-300">
                  As land data becomes increasingly central to modern
                  administration and planning, Surfboard provides the essential
                  tools you need to stay ahead. Our comprehensive platform
                  streamlines survey submission management, offers powerful plan
                  visualization, and delivers strategic insights from spatial
                  datasets—all in one intuitive interface.
                </p>
                <p className="mt-3 text-sm font-medium italic text-emerald-300">
                  "Transforming raw survey data into actionable intelligence."
                </p>
              </div>
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
              q="Can I upload survey plans outside Lagos?"
              a="Yes, you can upload survey plans for anywhere in the world."
            />
            <FAQ
              q="Is every QR Code unique to a survey plan?"
              a="Yes, each survey record automatically generates a unique QR Code for secure identification."
            />
            <FAQ
              q="When I scan the QR Code, will it show the location of the survey plan?"
              a="Yes, scanning the QR Code displays the location of the survey plan on an interactive map, along with additional details about the record."
            />
            <FAQ
              q="Can I navigate to the location of the survey plan?"
              a="Yes, simply click 'View on Google Maps' to get directions to the exact location."
            />
            <FAQ
              q="What is the required CSV file format?"
              a="Your file should have the following columns: Column 1: Pillar No, Column 2: X coordinate, Column 3: Y coordinate"
            />
            <FAQ
              q="Can I edit a record after upload?"
              a="Absolutely! You can click 'Edit' to make and save any necessary changes."
            />
            <FAQ
              q="Can Surfboard auto-detect wards and LGAs?"
              a="Yes. Given polygon geometry, Surfboard intersects against a Nigeria wards dataset to return ward, LCDA/LGA, and state metadata."
            />
            <FAQ
              q="Do you support big CSV files?"
              a="Yes. Large files are handled with streaming parsers and server-side validation; you'll see progress and row-level errors."
            />
            <FAQ
              q="Is geometry required?"
              a="No. You can upload pillars only — Surfboard generates and validates polygons for you."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-y border-white/5 bg-linear-to-br from-cyan-500/10 via-sky-500/10 to-blue-500/10 py-16">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
          <h2 className="text-balance text-3xl font-semibold sm:text-4xl">
            Ready to ship accurate survey plans?
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-slate-300">
            Start with a CSV, end with clean geometry, boundary metadata, and
            audit-ready records.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/surfboard/login"
              className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black hover:opacity-90"
            >
              Get Started Now
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-transparent py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="inline-flex items-center gap-2 text-sm text-white/80">
              <Image
                src="/surfboard/surf_light_logo.svg"
                alt="Surfboard"
                width={64}
                height={64}
              />{" "}
              Surfboard by
              <Link
                href="https://www.twonodetechnologies.com/surfboard"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/90 hover:text-white"
              >
                TwoNode Technologies
              </Link>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-5 text-xs text-white/80">
              <Link href="#features" className="hover:text-white">
                Features
              </Link>
              <Link href="#how" className="hover:text-white">
                How it works
              </Link>
              <Link href="#faq" className="hover:text-white">
                FAQ
              </Link>
              <Link href="/surfboard/badge" className="hover:text-white">
                Badge Video
              </Link>
            </nav>
          </div>
          <p className="mt-6 text-center text-xs text-slate-400">
            {new Date().getFullYear()} TwoNode Technologies. All rights
            reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-xl border border-white/10 bg-white/3 p-4 open:bg-white/5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
        <span className="text-sm font-medium">{q}</span>
        <ArrowRight className="h-4 w-4 transition group-open:rotate-90" />
      </summary>
      <p className="mt-2 text-sm text-slate-300">{a}</p>
    </details>
  );
}
