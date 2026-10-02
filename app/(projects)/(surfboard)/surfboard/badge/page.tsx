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
    primary: "#2563EB",
  },
};

const gradientBG =
  "bg-[radial-gradient(1200px_600px_at_50%_-20%,rgba(37,99,235,0.20),rgba(10,15,31,0))]";

export default function SurfboardBadgePage() {
  return (
    <div
      className={`min-h-screen text-white/90 flex flex-col ${gradientBG}`}
      style={{ backgroundColor: SURF_COLORS.bg.base }}
    >
      <header className="absolute top-0 z-40 w-full border-b border-white/5 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link
              href="/surfboard"
              className="group inline-flex items-center gap-2"
            >
              <Image
                src="/surfboard/surf_logo.svg"
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
              <Link
                href="/surfboard#how"
                className="hover:text-white transition-colors"
              >
                How it works
              </Link>
              <Link
                href="/surfboard#faq"
                className="hover:text-white transition-colors"
              >
                FAQ
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 pt-24 pb-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-2xl mx-auto rounded-3xl border border-white/10 bg-white/2 p-2 sm:p-4 backdrop-blur-md shadow-2xl shadow-blue-900/20"
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
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1 text-xs text-blue-200 mb-4">
              <ShieldCheck className="h-4 w-4" /> Official Surfboard Badge
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white mb-3">
              Your Survey Plan is Protected
            </h1>
            <div className="text-slate-300 text-sm sm:text-base max-w-md mb-8">
              <p className="mb-3">
                Scan the QR Code on the survey plan in the envelope to:
              </p>
              <ul className="list-none space-y-2 text-left mx-auto w-fit">
                <li className="flex items-start gap-2">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                  <span>View the property location on a map</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                  <span>Verify its authenticity instantly</span>
                </li>
              </ul>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
