"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";

const SURF_COLORS = {
  bg: {
    base: "#0A0F1F",
  },
  brand: {
    primary: "#38BDF8",
  },
};

const gradientBG =
  "bg-[radial-gradient(1200px_600px_at_50%_-20%,rgba(56,189,248,0.20),rgba(10,15,31,0))]";

export default function SurfboardBadgePage() {
  return (
    <div
      className={`min-h-screen text-white/90 flex flex-col ${gradientBG}`}
      style={{ backgroundColor: SURF_COLORS.bg.base }}
    >
      <header className="absolute top-0 z-40 w-full border-b border-white/5 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/surfboard" className="group inline-flex items-center gap-2">
              <Image
                src="/surfboard/surf_logo.png"
                alt="Surfboard"
                width={48}
                height={48}
                className="h-10 w-10"
              />
              <span className="font-semibold tracking-tight">Surfboard</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm text-white/80">
              <Link
                href="/surfboard#features"
                className="hover:text-white transition-colors"
              >
                Features
              </Link>
              <Link href="/surfboard#how" className="hover:text-white transition-colors">
                How it works
              </Link>
              <Link href="/surfboard#faq" className="hover:text-white transition-colors">
                FAQ
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

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 pt-24 pb-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-2xl mx-auto rounded-3xl border border-white/10 bg-white/[0.02] p-2 sm:p-4 backdrop-blur-md shadow-2xl shadow-cyan-900/20"
        >
          <div className="relative w-full flex justify-center overflow-hidden rounded-2xl bg-black/50 ring-1 ring-white/10">
            <video
              src="/surfboard/videos/SurfboardBadge.mp4"
              className="w-full h-auto max-h-[75vh] object-contain bg-black"
              autoPlay
              loop
              muted
              playsInline
              controls
            />
          </div>
          
          <div className="mt-8 flex flex-col items-center text-center px-4 pb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200 mb-4">
              <ShieldCheck className="h-4 w-4" /> Official Surfboard Badge
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white mb-3">
              Geospatial Intelligence for Survey Plans
            </h1>
            <p className="text-slate-300 text-sm sm:text-base max-w-md mb-8">
              Unlock the value of cadastral and geospatial data. Surfboard
              empowers surveyors and land administrators with actionable insights.
            </p>
            
            <Link
              href="/surfboard"
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/25"
              style={{
                backgroundColor: SURF_COLORS.brand.primary,
                color: "#0b0f19",
              }}
            >
              Explore Surfboard <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
