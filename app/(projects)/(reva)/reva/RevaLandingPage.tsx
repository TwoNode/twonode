"use client";

import React, { FC, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShieldCheck,
  Search,
  FileText,
  Compass,
  History,
  Map as MapIcon,
  Layers,
  CheckCircle2,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Sparkles,
  ExternalLink,
  Lock,
  Building2,
  FileCheck,
  Award,
  ArrowUpRight,
  Eye,
  Sliders,
  Database,
  Radio,
  Zap,
} from "lucide-react";

const RevaLandingPage: FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Core features from original page (retained 100%)
  const coreFeatures = [
    {
      title: "Property Search",
      desc: "Multi-parameter query system searching land parcels by coordinates, survey plan number, or local cadastral records.",
      icon: Search,
      tag: "Spatial Lookup",
    },
    {
      title: "Due Diligence Report",
      desc: "Comprehensive executive report detailing acquisition status, government excisions, and zoning classifications.",
      icon: FileText,
      tag: "Official Audit",
    },
    {
      title: "Title Verification",
      desc: "Instant legal matching against state gazettes, committed government acquisitions, and statutory records.",
      icon: ShieldCheck,
      tag: "Legal Assurance",
    },
    {
      title: "Survey Analysis",
      desc: "Mathematical boundary closure validation, beacon coordinate verification, and exact parcel area measurement.",
      icon: Compass,
      tag: "Cadastral Precision",
    },
    {
      title: "Risk Assessment",
      desc: "Predictive conflict detection highlighting potential road widening right-of-ways, drainage corridors, or boundary disputes.",
      icon: Layers,
      tag: "Investor Protection",
    },
  ];

  // Reasons from original page (retained 100%)
  const whyChooseReasons = [
    {
      title: "Comprehensive due diligence insights",
      desc: "Holistic evaluation of parcel legality, encumbrances, and statutory compliance in a single document.",
      icon: Award,
    },
    {
      title: "Title Search",
      desc: "Rigorous verification against official land registry archives, gazettes, and excision records.",
      icon: FileCheck,
    },
    {
      title: "Charting Information",
      desc: "Precision coordinate plotting on statutory layout plans and committed government acquisition master maps.",
      icon: Compass,
    },
    {
      title: "Historical Survey Record",
      desc: "Chronological audit of prior lodgments, original beacon numbers, and partition lineages.",
      icon: History,
    },
    {
      title: "Map of the property",
      desc: "High-definition cartographic GIS overlay displaying clear boundary pillars, neighboring lots, and access roads.",
      icon: MapIcon,
    },
  ];

  // How it works steps from original page (retained 100%)
  const howItWorks = [
    {
      step: "01",
      title: "Submit Request",
      desc: "Fill out the property details form with location and requirements.",
      actionText: "Open Request Form",
      actionLink: "/reva/requestform",
      icon: Sliders,
    },
    {
      step: "02",
      title: "Processing",
      desc: "Our team analyzes the property and gathers comprehensive data.",
      actionText: "GIS & Legal Analysis",
      actionLink: "#features",
      icon: Database,
    },
    {
      step: "03",
      title: "Receive Report",
      desc: "Download a detailed due diligence report.",
      actionText: "View Sample Preview",
      actionLink: "#report-preview",
      icon: FileCheck,
    },
  ];

  // Report preview items from original page (retained 100%)
  const reportPreview = [
    {
      number: 1,
      title: "Survey Data Management",
      desc: "Renders Surveyor's data in a manner that provides easy access, management and data-driven insight.",
      img: "/reva/preview/reva1.jpg",
      tag: "Survey Intelligence",
      icon: Compass,
    },
    {
      number: 2,
      title: "Oil and Gas ROW and Utility Asset Network Management",
      desc: "Keep track of all your assets, from pipelines to valve pits, metering stations, place markers, ensuring they are always up-to-date, accurately mapped, and accessible real-time with a mobile app.",
      img: "/reva/preview/reva2.jpg",
      tag: "Asset Pipeline Tracking",
      icon: Zap,
    },
    {
      number: 3,
      title: "Electric Utility Network Management",
      desc: "Visualize your entire electric grid in real-time, allowing for better monitoring and control of your assets.",
      img: "/reva/preview/reva3.jpg",
      tag: "Grid Visualization",
      icon: Zap,
    },
    {
      number: 4,
      title: "Telecommunication Asset in Real-Time",
      desc: "Visualize your entire telecommunication asset in real-time, allowing for better monitoring and control of your assets.",
      img: "/reva/preview/reva4.jpg",
      tag: "Telecom Infrastructure",
      icon: Radio,
    },
    {
      number: 5,
      title: "Electric Utility Network Management",
      desc: "Visualize your entire electric grid in real-time, allowing for better monitoring and control of your assets.",
      img: "/reva/preview/reva5.jpg",
      tag: "Distribution & Substations",
      icon: Zap,
    },
    {
      number: 6,
      title: "Telecommunication Asset in Real-Time",
      desc: "Visualize your entire telecommunication asset in real-time, allowing for better monitoring and control of your assets.",
      img: "/reva/preview/reva6.jpg",
      tag: "Fiber & Tower Coverage",
      icon: Radio,
    },
  ];

  // Autoplay for carousel
  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % reportPreview.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, reportPreview.length]);

  return (
    <div className="min-h-screen bg-[#020b18] text-slate-100 font-sans selection:bg-cyan-500 selection:text-white">
      {/* =========================================================================
          1. TOP NAVIGATION BAR (GLASSMORPHIC & RESPONSIVE)
      ========================================================================= */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#020b18]/85 border-b border-cyan-500/15 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Brand Logo & Name */}
            <Link
              href="/reva"
              className="flex items-center gap-3.5 group transition-transform hover:scale-105"
            >
              <div className="relative w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 shadow-md shadow-cyan-500/20">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden p-1">
                  <Image
                    src="/reva/revaLogo.png"
                    alt="REVA Logo"
                    width={40}
                    height={40}
                    className="object-contain"
                    priority
                  />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
                  REVA
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                    Due Diligence
                  </span>
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  by TwoNode Technologies
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-slate-300">
              <Link
                href="#about"
                className="hover:text-cyan-400 transition-colors"
              >
                About
              </Link>
              <Link
                href="#why-reva"
                className="hover:text-cyan-400 transition-colors"
              >
                Why REVA
              </Link>
              <Link
                href="#features"
                className="hover:text-cyan-400 transition-colors"
              >
                Core Features
              </Link>
              <Link
                href="#how-it-works"
                className="hover:text-cyan-400 transition-colors"
              >
                How It Works
              </Link>
              <Link
                href="#report-preview"
                className="hover:text-cyan-400 transition-colors"
              >
                GIS Solutions
              </Link>
            </nav>

            {/* Right Action Buttons */}
            <div className="hidden sm:flex items-center gap-3">
              <Link
                href="/reva/onetimerequest"
                className="text-xs sm:text-sm font-medium text-cyan-300 hover:text-white px-3.5 py-2 rounded-lg border border-cyan-500/30 hover:border-cyan-400/60 bg-cyan-950/30 hover:bg-cyan-900/40 transition-all"
              >
                One-Time Request
              </Link>
              <Link
                href="/reva/login"
                className="text-xs sm:text-sm font-medium text-slate-300 hover:text-white px-3.5 py-2 rounded-lg hover:bg-slate-800/60 transition-all"
              >
                Sign In
              </Link>
              <Link
                href="/reva/requestform"
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-white px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 via-cyan-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-md shadow-cyan-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                Request a Report
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 focus:outline-none"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-cyan-500/20 bg-[#020b18]/95 backdrop-blur-2xl px-6 py-6 flex flex-col gap-4 shadow-2xl">
            <Link
              href="#about"
              onClick={() => setMobileMenuOpen(false)}
              className="text-slate-200 hover:text-cyan-400 text-base font-medium py-1"
            >
              About REVA
            </Link>
            <Link
              href="#why-reva"
              onClick={() => setMobileMenuOpen(false)}
              className="text-slate-200 hover:text-cyan-400 text-base font-medium py-1"
            >
              Why Choose REVA
            </Link>
            <Link
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="text-slate-200 hover:text-cyan-400 text-base font-medium py-1"
            >
              Core Features
            </Link>
            <Link
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="text-slate-200 hover:text-cyan-400 text-base font-medium py-1"
            >
              How It Works
            </Link>
            <Link
              href="#report-preview"
              onClick={() => setMobileMenuOpen(false)}
              className="text-slate-200 hover:text-cyan-400 text-base font-medium py-1"
            >
              GIS Solutions & Preview
            </Link>

            <div className="pt-4 border-t border-slate-800 flex flex-col gap-3">
              <Link
                href="/reva/onetimerequest"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-lg border border-cyan-500/30 text-cyan-300 font-medium text-sm hover:bg-cyan-950/40"
              >
                Submit One-Time Request
              </Link>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/reva/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-lg bg-slate-800/80 text-slate-200 font-medium text-sm hover:bg-slate-700"
                >
                  Sign In
                </Link>
                <Link
                  href="/reva/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-lg bg-slate-800/80 text-slate-200 font-medium text-sm hover:bg-slate-700"
                >
                  Register
                </Link>
              </div>
              <Link
                href="/reva/requestform"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-3 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/25"
              >
                Request a Report Now
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* =========================================================================
          2. SPECTACULAR HERO SECTION
      ========================================================================= */}
      <section className="relative overflow-hidden pt-12 pb-24 lg:pt-20 lg:pb-32">
        {/* Subtle Background Glow Mesh & Radial Highlights */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[650px] pointer-events-none -z-10">
          <div className="absolute top-10 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[128px]" />
          <div className="absolute top-24 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-[140px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-full h-[500px] bg-indigo-900/10 rounded-full blur-[160px]" />
        </div>

        {/* Subtle Coordinate Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none -z-10"
          style={{
            backgroundImage: `radial-gradient(#38bdf8 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
          }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-7 text-center lg:text-left">
              {/* Badge Pill */}
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs sm:text-sm font-medium mb-6 shadow-inner">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
                </span>
                <span>Real Estate Due Diligence Platform</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-300 font-normal">
                  Geospatial Intelligence
                </span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.12]">
                Real Estate Due Diligence{" "}
                <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 bg-clip-text text-transparent">
                  Just Got Intelligent!
                </span>
              </h1>

              {/* Main Subtitle Description */}
              <p className="mt-6 text-lg sm:text-xl text-slate-300 font-normal leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Request a structured land report with ease in just a few clicks.
                Empowering property buyers, surveyors, and institutional
                investors with verified spatial coordinates, title charting, and
                boundary precision.
              </p>

              {/* Call to Action Buttons */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link
                  href="/reva/requestform"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold text-base shadow-xl shadow-cyan-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  Request a Report
                  <ArrowRight className="w-5 h-5" />
                </Link>

                <Link
                  href="/reva/onetimerequest"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white font-medium text-base border border-slate-700/80 hover:border-cyan-500/50 shadow-md transition-all"
                >
                  One-Time Request
                  <ExternalLink className="w-4 h-4 text-cyan-400" />
                </Link>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
                  <Link
                    href="/reva/login"
                    className="text-sm font-medium text-slate-300 hover:text-white px-4 py-3 rounded-xl hover:bg-slate-800/60 transition-colors"
                  >
                    Sign In
                  </Link>
                  <span className="text-slate-600">/</span>
                  <Link
                    href="/reva/login"
                    className="text-sm font-medium text-slate-300 hover:text-white px-4 py-3 rounded-xl hover:bg-slate-800/60 transition-colors"
                  >
                    Register
                  </Link>
                </div>
              </div>

              {/* Trust Indicators Strip */}
              <div className="mt-12 pt-8 border-t border-slate-800/80 grid grid-cols-3 gap-4 text-center lg:text-left">
                <div>
                  <div className="text-2xl font-bold text-white tracking-tight">
                    5-Point
                  </div>
                  <div className="text-xs text-slate-400 font-medium mt-0.5">
                    Due Diligence Audit
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-cyan-400 tracking-tight">
                    100%
                  </div>
                  <div className="text-xs text-slate-400 font-medium mt-0.5">
                    Digital Turnaround
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white tracking-tight">
                    GIS-Backed
                  </div>
                  <div className="text-xs text-slate-400 font-medium mt-0.5">
                    Surveyor Precision
                  </div>
                </div>
              </div>
            </div>

            {/* Right Interactive Mockup Card */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none rounded-2xl p-1 bg-gradient-to-b from-cyan-500/30 via-blue-500/10 to-transparent shadow-2xl shadow-cyan-500/10">
                <div className="rounded-xl bg-[#03152c]/95 border border-cyan-500/20 backdrop-blur-xl p-6 sm:p-7 text-left overflow-hidden">
                  {/* Decorative glowing corner */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/10 rounded-full blur-2xl" />

                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-cyan-950 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wider font-semibold text-cyan-400">
                          Due Diligence Report
                        </div>
                        <div className="text-sm font-bold text-white">
                          Sample Land Parcel Audit
                        </div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      Verified Clear
                    </span>
                  </div>

                  {/* Parcel Details */}
                  <div className="py-4 space-y-3">
                    <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800/80 flex items-center justify-between">
                      <div className="text-xs text-slate-400">
                        Centroid Coordinates
                      </div>
                      <div className="text-xs font-mono font-semibold text-cyan-300">
                        6°34&apos;05.7&quot;N 3°23&apos;37.4&quot;E
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/60">
                        <span className="text-slate-400 block mb-1">
                          LGA Jurisdiction
                        </span>
                        <span className="font-semibold text-white">
                          Kosofe, Lagos State
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/60">
                        <span className="text-slate-400 block mb-1">
                          Cadastral Status
                        </span>
                        <span className="font-semibold text-emerald-400">
                          Uncommitted Land
                        </span>
                      </div>
                    </div>

                    {/* Verification Checklist */}
                    <div className="pt-2 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span>Title Search & Gazette Excision Matched</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span>
                          Statutory Charting: No Road or Utility Encroachment
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span>
                          Beacon Survey Coordinates Mathematically Closed
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Action Footer */}
                  <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-cyan-400" />
                      Encrypted & Tamper-Proof
                    </span>
                    <Link
                      href="/reva/requestform"
                      className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      Request Your Property Audit
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. ABOUT REVA SECTION
      ========================================================================= */}
      <section
        id="about"
        className="py-24 relative border-t border-slate-800/80 bg-gradient-to-b from-[#020b18] via-[#03152c] to-[#020b18]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Visual Logo Emblem Display */}
            <div className="lg:col-span-5 order-2 lg:order-1 flex justify-center">
              <div className="relative group w-full max-w-sm">
                <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/30 to-cyan-500/30 rounded-3xl blur-2xl opacity-50 group-hover:opacity-80 transition duration-500" />
                <div className="relative rounded-2xl bg-[#041935] border border-cyan-500/30 p-8 sm:p-10 shadow-2xl flex flex-col items-center text-center">
                  <div className="relative w-40 h-40 sm:w-44 sm:h-44 mb-6 p-4 rounded-2xl bg-white shadow-xl flex items-center justify-center">
                    <Image
                      src="/reva/revaLogo.png"
                      alt="About REVA"
                      width={170}
                      height={170}
                      className="object-contain"
                    />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-white tracking-tight">
                      Virtual Real Estate Assistant
                    </h3>
                    <p className="text-xs text-cyan-400 font-medium">
                      TwoNode Intelligent Due Diligence Engine
                    </p>
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-800 w-full grid grid-cols-2 gap-4 text-center">
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                      <div className="text-xs text-slate-400">Target User</div>
                      <div className="text-sm font-semibold text-slate-200">
                        Buyers & Pros
                      </div>
                    </div>
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                      <div className="text-xs text-slate-400">
                        GIS Expertise
                      </div>
                      <div className="text-sm font-semibold text-emerald-400">
                        None Required
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* About Content */}
            <div className="lg:col-span-7 order-1 lg:order-2 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-500/30 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-4">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                Intelligent Land Intelligence
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
                About REVA
              </h2>

              {/* Exact content from original page preserved */}
              <p className="mt-6 text-lg sm:text-xl text-slate-300 leading-relaxed font-normal">
                REVA is a cutting-edge digital platform designed to simplify
                real estate due diligence. By providing structured and detailed
                reports on land parcels, REVA empowers users to make informed
                decisions without requiring GIS expertise. Experience seamless
                transactions and trusted due diligence insights with just a few
                clicks.
              </p>

              {/* Three Strategic Value Pillars */}
              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 text-left">
                  <div className="w-9 h-9 rounded-lg bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-white">
                      Zero GIS Expertise Required
                    </h4>
                    <p className="text-sm text-slate-400 mt-0.5">
                      Complex coordinate systems, cadastral projections, and
                      statutory layers are translated into clear, human-readable
                      verdicts.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 text-left">
                  <div className="w-9 h-9 rounded-lg bg-blue-950/80 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-white">
                      Structured Land Parcel Reports
                    </h4>
                    <p className="text-sm text-slate-400 mt-0.5">
                      Receive standardized, audit-ready PDF reports with
                      verified boundaries, acquisition details, and beacon
                      accuracy.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 text-left">
                  <div className="w-9 h-9 rounded-lg bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-white">
                      Trusted Due Diligence in a Few Clicks
                    </h4>
                    <p className="text-sm text-slate-400 mt-0.5">
                      Fast, transparent intake whether through our full member
                      dashboard or direct one-time requests.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. WHY CHOOSE REVA? SECTION
      ========================================================================= */}
      <section
        id="why-reva"
        className="py-24 relative border-t border-slate-800/80 bg-[#020b18]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-semibold uppercase tracking-wider mb-4">
              <Award className="w-3.5 h-3.5 text-cyan-400" />
              Uncompromised Accuracy
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
              Why Choose REVA?
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-400">
              Transforming complex land administration and surveyor records into
              crystal-clear property intelligence.
            </p>
          </div>

          {/* 5 Reasons Grid - 100% of original reasons elevated */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {whyChooseReasons.map((reason, index) => {
              const Icon = reason.icon;
              return (
                <div
                  key={index}
                  className={`group relative rounded-2xl p-7 bg-[#03172e] border border-slate-800 hover:border-cyan-500/50 hover:bg-[#031d3a] transition-all duration-300 shadow-lg hover:shadow-cyan-500/10 hover:-translate-y-1 ${
                    index === 0 ? "md:col-span-2 lg:col-span-1" : ""
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-5 group-hover:scale-110 group-hover:bg-cyan-900/60 transition-all">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                    {reason.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed font-normal">
                    {reason.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. CORE FEATURES SECTION
      ========================================================================= */}
      <section
        id="features"
        className="py-24 relative border-t border-slate-800/80 bg-gradient-to-b from-[#020b18] via-[#04162e] to-[#020b18]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-500/30 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-4">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              Platform Capabilities
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
              Core Features
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-400">
              Engineered to protect property investments and accelerate
              transaction confidence.
            </p>
          </div>

          {/* 5 Core Features Grid - 100% of original features retained */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coreFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className={`group relative rounded-2xl p-7 bg-[#03152c] border border-slate-800 hover:border-blue-500/50 hover:bg-[#041c3b] transition-all duration-300 shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1 ${
                    index === 4 ? "md:col-span-2 lg:col-span-1" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-12 h-12 rounded-xl bg-blue-950/80 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 group-hover:bg-blue-900/60 transition-all">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-900 text-cyan-300 border border-cyan-500/20">
                      {feature.tag}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed font-normal">
                    {feature.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. HOW IT WORKS SECTION (CONNECTED TIMELINE)
      ========================================================================= */}
      <section
        id="how-it-works"
        className="py-24 relative border-t border-slate-800/80 bg-[#020b18]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-semibold uppercase tracking-wider mb-4">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              Seamless Workflow
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
              How It Works
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-400">
              From raw survey coordinates to a comprehensive due diligence
              report in three simple steps.
            </p>
          </div>

          {/* Stepper Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {howItWorks.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={index}
                  className="relative rounded-2xl p-8 bg-[#03172e] border border-slate-800 hover:border-cyan-500/40 transition-all duration-300 flex flex-col justify-between shadow-xl hover:-translate-y-1"
                >
                  <div>
                    {/* Step Number Badge */}
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-3xl font-extrabold tracking-tight text-cyan-400/90 font-mono">
                        Step {index + 1}
                      </span>
                      <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                        <Icon className="w-5 h-5" />
                      </div>
                    </div>

                    <h3 className="text-2xl font-bold text-white mb-3">
                      {step.title}
                    </h3>

                    {/* Exact step description preserved */}
                    <p className="text-slate-300 text-base leading-relaxed">
                      {step.desc}
                    </p>
                  </div>

                  <div className="mt-8 pt-6 border-t border-slate-800/80">
                    <Link
                      href={step.actionLink}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      {step.actionText}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          7. GIS SOLUTIONS & REPORT PREVIEW SHOWCASE (INTERACTIVE CAROUSEL)
      ========================================================================= */}
      <section
        id="report-preview"
        className="py-24 relative border-t border-slate-800/80 bg-gradient-to-b from-[#020b18] via-[#03152c] to-[#020b18]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-500/30 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-4">
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              Geospatial Intelligence In Action
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
              GIS Solutions & Report Previews
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-400">
              Explore the rich asset tracking, utility mapping, and survey
              management capabilities powering the REVA ecosystem.
            </p>
          </div>

          {/* Carousel Viewer */}
          <div
            className="rounded-3xl bg-[#031429] border border-cyan-500/20 p-6 sm:p-10 shadow-2xl relative overflow-hidden"
            onMouseEnter={() => setIsAutoPlaying(false)}
            onMouseLeave={() => setIsAutoPlaying(true)}
          >
            {/* Background Ambient Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
              {/* Image Preview Window */}
              <div className="lg:col-span-7 order-2 lg:order-1">
                <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl aspect-[4/3] flex items-center justify-center group">
                  <div className="relative w-full h-full flex items-center justify-center p-3">
                    <img
                      src={reportPreview[activeSlide].img}
                      alt={reportPreview[activeSlide].title}
                      className="w-full h-full object-contain rounded-xl transition-all duration-500"
                    />
                  </div>

                  {/* Slide Counter Overlay */}
                  <div className="absolute bottom-4 left-4 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700 text-xs font-mono text-cyan-300">
                    Preview {activeSlide + 1} of {reportPreview.length}
                  </div>
                </div>
              </div>

              {/* Slide Content & Selector */}
              <div className="lg:col-span-5 order-1 lg:order-2 flex flex-col justify-between space-y-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-950 text-cyan-300 text-xs font-semibold uppercase tracking-wider mb-4 border border-cyan-500/30">
                    {reportPreview[activeSlide].tag}
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
                    {reportPreview[activeSlide].title}
                  </h3>

                  {/* Exact description from original reportPreview */}
                  <p className="mt-4 text-base text-slate-300 leading-relaxed font-normal">
                    {reportPreview[activeSlide].desc}
                  </p>
                </div>

                {/* Thumbnails / Slide Indicators */}
                <div className="space-y-4 pt-4 border-t border-slate-800">
                  <div className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                    Select a Solution Preview:
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    {reportPreview.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveSlide(idx)}
                        className={`h-12 rounded-lg border text-xs font-bold transition-all flex items-center justify-center ${
                          activeSlide === idx
                            ? "bg-cyan-500 text-white border-cyan-400 shadow-md shadow-cyan-500/30 scale-105"
                            : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white"
                        }`}
                        title={item.title}
                      >
                        0{item.number}
                      </button>
                    ))}
                  </div>

                  {/* Navigation Arrows */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() =>
                        setActiveSlide(
                          (prev) =>
                            (prev - 1 + reportPreview.length) %
                            reportPreview.length
                        )
                      }
                      className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-white transition-all flex items-center gap-1 text-xs font-semibold"
                    >
                      <ChevronLeft className="w-4 h-4" /> Previous
                    </button>

                    <button
                      onClick={() =>
                        setActiveSlide(
                          (prev) => (prev + 1) % reportPreview.length
                        )
                      }
                      className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-white transition-all flex items-center gap-1 text-xs font-semibold"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          8. INFORMED DECISION (CALL TO ACTION SECTION)
      ========================================================================= */}
      <section className="py-24 relative border-t border-slate-800/80 bg-[#020b18]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="relative rounded-3xl p-8 sm:p-14 bg-gradient-to-r from-blue-900/60 via-slate-900/90 to-cyan-950/70 border border-cyan-500/30 shadow-2xl backdrop-blur-xl overflow-hidden">
            {/* Ambient Radial Accent */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-400/15 rounded-full blur-3xl pointer-events-none" />

            {/* Exact content preserved */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
              Informed Decision
            </h2>
            <p className="mt-4 text-lg sm:text-xl text-slate-300 font-normal max-w-2xl mx-auto">
              With REVA make quick and informed land investment decisions.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/reva/requestform"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold text-base shadow-xl shadow-cyan-500/25 transition-all transform hover:-translate-y-0.5"
              >
                Request a Report
                <ArrowRight className="w-5 h-5" />
              </Link>

              <Link
                href="/reva/onetimerequest"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white font-medium text-base border border-slate-700 transition-all"
              >
                One-Time Request
              </Link>

              <Link
                href="/reva/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-slate-300 hover:text-white text-base font-medium hover:bg-slate-800/60 transition-all"
              >
                Sign In / Register
              </Link>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-800 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Verified Cadastral Records
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Instant Secure Paystack Checkout
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Executive PDF Deliverables
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          9. COMPREHENSIVE FOOTER
      ========================================================================= */}
      <footer className="border-t border-slate-800 bg-[#010813] text-slate-400 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
            {/* Brand Column */}
            <div className="lg:col-span-2 space-y-4">
              <Link href="/reva" className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white p-1 flex items-center justify-center">
                  <Image
                    src="/reva/revaLogo.png"
                    alt="REVA Logo"
                    width={32}
                    height={32}
                    className="object-contain"
                  />
                </div>
                <span className="text-xl font-extrabold text-white tracking-tight">
                  REVA
                </span>
              </Link>
              <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
                Advanced real estate due diligence platform by TwoNode
                Technologies. Fast, structured land parcel reports and
                geospatial intelligence for secure transactions.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                Navigation
              </h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link
                    href="#about"
                    className="hover:text-cyan-400 transition-colors"
                  >
                    About REVA
                  </Link>
                </li>
                <li>
                  <Link
                    href="#why-reva"
                    className="hover:text-cyan-400 transition-colors"
                  >
                    Why Choose REVA
                  </Link>
                </li>
                <li>
                  <Link
                    href="#features"
                    className="hover:text-cyan-400 transition-colors"
                  >
                    Core Features
                  </Link>
                </li>
                <li>
                  <Link
                    href="#how-it-works"
                    className="hover:text-cyan-400 transition-colors"
                  >
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link
                    href="#report-preview"
                    className="hover:text-cyan-400 transition-colors"
                  >
                    GIS Solutions
                  </Link>
                </li>
              </ul>
            </div>

            {/* Portals */}
            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                Portals & Actions
              </h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link
                    href="/reva/requestform"
                    className="hover:text-cyan-400 transition-colors"
                  >
                    Request a Report
                  </Link>
                </li>
                <li>
                  <Link
                    href="/reva/onetimerequest"
                    className="hover:text-cyan-400 transition-colors"
                  >
                    One-Time Request
                  </Link>
                </li>
                <li>
                  <Link
                    href="/reva/login"
                    className="hover:text-cyan-400 transition-colors"
                  >
                    User Login
                  </Link>
                </li>
                <li>
                  <Link
                    href="/reva/dashboard"
                    className="hover:text-cyan-400 transition-colors"
                  >
                    Client Dashboard
                  </Link>
                </li>
                <li>
                  <Link
                    href="/reva-restricted/login"
                    className="hover:text-cyan-400 transition-colors"
                  >
                    Admin Portal
                  </Link>
                </li>
              </ul>
            </div>

            {/* Corporate Links */}
            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                TwoNode
              </h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link
                    href="/"
                    className="hover:text-cyan-400 transition-colors"
                  >
                    Corporate Home
                  </Link>
                </li>
                <li>
                  <Link
                    href="/our-story"
                    className="hover:text-cyan-400 transition-colors"
                  >
                    Our Story
                  </Link>
                </li>
                <li>
                  <Link
                    href="/insights"
                    className="hover:text-cyan-400 transition-colors"
                  >
                    Insights & Articles
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="hover:text-cyan-400 transition-colors"
                  >
                    Contact Us
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Copyright Strip */}
          <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <p>
              © 2026 REVA by TwoNode Technologies Limited. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-slate-500">
              <Link href="/reva/requestform" className="hover:text-slate-400">
                Terms of Request
              </Link>
              <span>•</span>
              <Link href="/contact" className="hover:text-slate-400">
                Support & Inquiries
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default RevaLandingPage;
