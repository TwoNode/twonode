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
  Menu,
} from "lucide-react";
import { SURFBOARD_COLORS } from "@/surfboard/colors";

// Bold gradients built from the real brand tokens (navy -> deep blue -> teal),
// mirroring the pattern used for GBC's hero/CTA gradients.
const SURFBOARD_GRADIENTS = {
  hero: `linear-gradient(155deg, ${SURFBOARD_COLORS.primary.dark} 0%, ${SURFBOARD_COLORS.primary.main} 55%, ${SURFBOARD_COLORS.secondary.main} 130%)`,
  primary: `linear-gradient(90deg, ${SURFBOARD_COLORS.primary.main} 60%, ${SURFBOARD_COLORS.secondary.main} 100%)`,
};

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

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: SURFBOARD_COLORS.background.default }}
    >
      {/* NAV */}
      <header
        className="sticky top-0 z-40 border-b border-white/10 backdrop-blur"
        style={{ background: SURFBOARD_GRADIENTS.hero }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="#" className="group inline-flex items-center gap-2">
              <Image
                src="/surfboard/surf_logo.svg"
                alt="Surfboard"
                width={64}
                height={64}
              />
              <span className="font-semibold tracking-tight text-white">
                Surfboard
              </span>
              <span className="ml-2 rounded-full bg-white/15 px-2.5 py-0.5 text-xs text-white ring-1 ring-white/25">
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
                className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 hover:opacity-90"
                style={{ color: SURFBOARD_COLORS.primary.dark }}
              >
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
              <details className="relative md:hidden group">
                <summary
                  className="list-none flex items-center justify-center h-10 w-10 rounded-lg bg-white/10 border border-white/20 cursor-pointer"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5 text-white" />
                </summary>
                <div
                  className="absolute right-0 top-12 w-56 rounded-xl border border-white/10 bg-white p-2 shadow-2xl z-50"
                  style={{ color: SURFBOARD_COLORS.primary.dark }}
                >
                  <Link
                    href="#features"
                    className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-100"
                  >
                    Features
                  </Link>
                  <Link
                    href="#how"
                    className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-100"
                  >
                    How it works
                  </Link>
                  <Link
                    href="#faq"
                    className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-100"
                  >
                    FAQ
                  </Link>
                  <Link
                    href="/surfboard/badge"
                    className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-100"
                  >
                    Badge Video
                  </Link>
                  <div className="my-1 border-t border-gray-100 sm:hidden" />
                  <Link
                    href="/surfboard/login"
                    className="sm:hidden block rounded-lg px-3 py-2 text-sm font-semibold hover:bg-gray-100"
                  >
                    Get Started
                  </Link>
                </div>
              </details>
            </div>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section
        className="relative overflow-hidden"
        style={{ background: SURFBOARD_GRADIENTS.hero }}
      >
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs text-white">
              <Sparkles className="h-3.5 w-3.5" /> New: Interactive map analysis
              & ward/LGA auto-detection
            </div>
            <h1 className="mt-5 text-balance text-4xl font-semibold leading-tight text-white sm:text-5xl">
              Surfboard: Geospatial Intelligence for Survey Plans
            </h1>
            <p className="mt-4 max-w-xl text-pretty text-white/80">
              Unlock the value of cadastral and geospatial data. Surfboard
              empowers surveyors, planners, and land administrators with
              actionable insights and structured land intelligence.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/surfboard/login"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                style={{ color: SURFBOARD_COLORS.primary.dark }}
              >
                Get Started Now <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/surfboard/badge"
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/25 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                View Badge Video
              </Link>
            </div>
            <div className="mt-6 flex items-center gap-5 text-xs text-white/75">
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
            <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl border border-white/20 bg-white/10 shadow-2xl">
              <div className="absolute inset-0 grid place-items-center">
                <Image
                  src="/surfboard/map_screenshot.png"
                  alt="Map Preview"
                  className="h-[65%] w-[85%] opacity-95"
                  width={100}
                  height={100}
                />
              </div>
              <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-black/40 px-3 py-1 text-xs text-white/90 ring-1 ring-white/20">
                <ZoomIn className="h-3.5 w-3.5" /> Map preview
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FEATURES */}
      <section
        id="features"
        className="relative py-20"
        style={{ backgroundColor: SURFBOARD_COLORS.background.default }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold text-gray-900 sm:text-4xl">
              Built for surveyors and land admins
            </h2>
            <p className="mt-3 text-gray-600">
              Everything you need from CSV to certificate in one flow.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, index) => {
              const isAlt = index % 2 === 1;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.35 }}
                  className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm ring-1 ring-black/2 transition-shadow hover:shadow-lg"
                >
                  <div
                    className="mb-3 inline-flex rounded-lg p-2"
                    style={{
                      backgroundColor: isAlt
                        ? SURFBOARD_COLORS.secondary.light
                        : SURFBOARD_COLORS.surface.main,
                    }}
                  >
                    <f.icon
                      className="h-5 w-5"
                      style={{
                        color: isAlt
                          ? SURFBOARD_COLORS.secondary.dark
                          : SURFBOARD_COLORS.primary.main,
                      }}
                    />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {f.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-20" style={{ backgroundColor: "#FFFFFF" }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold text-gray-900 sm:text-4xl">
              From CSV to certificate
            </h2>
            <p className="mt-2 text-gray-600">
              A minimal, auditable pipeline that just works.
            </p>
          </div>

          <ol className="mx-auto mt-12 center justify-center flex max-w-5xl flex-wrap gap-6">
            {steps.map((s, index) => {
              const isAlt = index % 2 === 1;
              return (
                <li
                  key={s.title}
                  className="group basis-1/4 min-w-50 relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-sm transition-all duration-300 hover:border-gray-200 hover:shadow-lg"
                >
                  <div className="absolute -right-6 -top-6 text-7xl font-bold text-gray-100 transition-all duration-300 group-hover:text-gray-200">
                    {index + 1}
                  </div>
                  <div
                    className="relative z-10 mx-auto mb-4 inline-flex rounded-xl p-3"
                    style={{
                      backgroundColor: isAlt
                        ? SURFBOARD_COLORS.secondary.light
                        : SURFBOARD_COLORS.surface.main,
                    }}
                  >
                    <s.icon
                      className="h-6 w-6"
                      style={{
                        color: isAlt
                          ? SURFBOARD_COLORS.secondary.dark
                          : SURFBOARD_COLORS.primary.main,
                      }}
                    />
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-gray-900">
                    {s.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-600">
                    {s.desc}
                  </p>
                </li>
              );
            })}
          </ol>

          <div
            className="mx-auto mt-16 max-w-4xl rounded-2xl border p-6"
            style={{
              borderColor: SURFBOARD_COLORS.accent.light,
              background: `linear-gradient(to right, ${SURFBOARD_COLORS.accent.light}22, ${SURFBOARD_COLORS.accent.main}11)`,
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{
                  backgroundColor: `${SURFBOARD_COLORS.accent.main}22`,
                  color: SURFBOARD_COLORS.accent.dark,
                }}
              >
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="mb-2 text-lg font-medium text-gray-900">
                  Empowering Land Professionals
                </h3>
                <p className="text-sm leading-relaxed text-gray-600">
                  As land data becomes increasingly central to modern
                  administration and planning, Surfboard provides the essential
                  tools you need to stay ahead. Our comprehensive platform
                  streamlines survey submission management, offers powerful plan
                  visualization, and delivers strategic insights from spatial
                  datasets—all in one intuitive interface.
                </p>
                <p
                  className="mt-3 text-sm font-medium italic"
                  style={{ color: SURFBOARD_COLORS.accent.dark }}
                >
                  "Transforming raw survey data into actionable intelligence."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section
        id="faq"
        className="py-20"
        style={{ backgroundColor: SURFBOARD_COLORS.background.default }}
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-2xl font-semibold text-gray-900">
            Frequently asked
          </h2>
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
      <section
        className="py-16 text-white"
        style={{ background: SURFBOARD_GRADIENTS.hero }}
      >
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
          <h2 className="text-balance text-3xl font-semibold sm:text-4xl">
            Ready to ship accurate survey plans?
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-white/80">
            Start with a CSV, end with clean geometry, boundary metadata, and
            audit-ready records.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/surfboard/login"
              className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold hover:opacity-90"
              style={{ color: SURFBOARD_COLORS.primary.dark }}
            >
              Get Started Now
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        className="border-t py-10"
        style={{
          backgroundColor: SURFBOARD_COLORS.background.paper,
          borderColor: "#E5E7EB",
        }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="inline-flex items-center gap-2 text-sm text-gray-700">
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
                className="text-gray-900 hover:opacity-80"
              >
                TwoNode Technologies
              </Link>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-5 text-xs text-gray-700">
              <Link href="#features" className="hover:text-gray-900">
                Features
              </Link>
              <Link href="#how" className="hover:text-gray-900">
                How it works
              </Link>
              <Link href="#faq" className="hover:text-gray-900">
                FAQ
              </Link>
              <Link href="/surfboard/badge" className="hover:text-gray-900">
                Badge Video
              </Link>
            </nav>
          </div>
          <p className="mt-6 text-center text-xs text-gray-500">
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
    <details className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm open:shadow-md">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
        <span className="text-sm font-medium text-gray-900">{q}</span>
        <ArrowRight className="h-4 w-4 text-gray-500 transition group-open:rotate-90" />
      </summary>
      <p className="mt-2 text-sm text-gray-600">{a}</p>
    </details>
  );
}
