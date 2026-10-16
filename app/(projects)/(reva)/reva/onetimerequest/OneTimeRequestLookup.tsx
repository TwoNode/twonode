"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Mail,
  ArrowRight,
  FileCheck,
  ShieldCheck,
  Clock,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  Home,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RevaThemeToggle } from "../components/RevaThemeToggle";

interface OneTimeRequestLookupProps {
  initialReference?: string;
  initialEmail?: string;
  errorMessage?: string;
}

export function OneTimeRequestLookup({
  initialReference = "",
  initialEmail = "",
  errorMessage,
}: OneTimeRequestLookupProps) {
  const router = useRouter();
  const [reference, setReference] = useState(initialReference);
  const [email, setEmail] = useState(initialEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientError, setClientError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setClientError("");

    const trimmedRef = reference.trim();
    const trimmedEmail = email.trim();

    if (!trimmedRef) {
      setClientError("Please enter your request reference ID.");
      return;
    }
    if (!trimmedEmail) {
      setClientError("Please enter the email address used for the request.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setClientError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    const params = new URLSearchParams({
      reference: trimmedRef,
      email: trimmedEmail,
    });
    router.push(`/reva/onetimerequest?${params.toString()}`);
  };

  const activeError = clientError || errorMessage;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020b18] text-slate-800 dark:text-slate-100 font-sans selection:bg-cyan-500 selection:text-white flex flex-col justify-between transition-colors">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 opacity-40 dark:opacity-100">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-175 h-125 bg-cyan-600/10 rounded-full blur-[140px]" />
        <div className="absolute top-2/3 right-1/4 w-100 h-100 bg-blue-600/10 rounded-full blur-[120px]" />
      </div>

      {/* Top Navbar */}
      <header className="relative z-10 border-b border-slate-200 dark:border-cyan-500/15 backdrop-blur-xl bg-white/80 dark:bg-[#020b18]/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/reva" className="flex items-center gap-3 group shrink-0">
            <div className="relative w-10 h-10 rounded-full p-0.5 bg-linear-to-tr from-cyan-400 via-blue-500 to-indigo-600 shadow-md shadow-cyan-500/20">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden p-1">
                <Image
                  src="/reva/revaLogo.png"
                  alt="REVA Logo"
                  width={36}
                  height={36}
                  className="object-contain"
                  priority
                />
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                  REVA
                </span>
                <span className="text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 dark:border-cyan-500/30 whitespace-nowrap">
                  Due Diligence
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                by TwoNode Technologies
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              href="/reva"
              className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors flex items-center gap-1.5"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">REVA Home</span>
            </Link>
            <RevaThemeToggle />
            <Link
              href="/reva/requestform"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-white px-3.5 sm:px-4 py-2 rounded-lg bg-linear-to-r from-blue-600 via-cyan-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-md shadow-cyan-500/25 transition-all"
            >
              <FileText className="w-4 h-4" />
              <span>New Request</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-16 flex flex-col justify-center">
        {/* Header Pill & Title */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-50 dark:bg-cyan-950/70 border border-cyan-200 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-xs font-semibold mb-4 shadow-xs dark:shadow-inner">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Guest & One-Time Tracking Portal</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            Track Your Due Diligence{" "}
            <span className="bg-linear-to-r from-blue-600 via-cyan-600 to-sky-500 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">
              Request
            </span>
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            Enter your request reference ID and the email address used during
            submission to inspect real-time audit progress, cadastral checks, and
            download your completed report.
          </p>
        </div>

        {/* Tracking Card */}
        <div className="bg-white/95 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200 dark:border-cyan-500/25 rounded-2xl p-6 sm:p-10 shadow-xl dark:shadow-2xl dark:shadow-cyan-950/50 transition-colors">
          {activeError && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-500/40 text-red-800 dark:text-red-200 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-red-900 dark:text-red-100">
                  Request Lookup Notice
                </p>
                <p className="mt-0.5 text-xs sm:text-sm text-red-700 dark:text-red-300">
                  {activeError}
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="reference"
                className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2"
              >
                Request Reference Number
              </label>
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-cyan-400/80" />
                <Input
                  id="reference"
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. REV-REQ-123456 or Paystack reference"
                  className="pl-11 h-12 bg-slate-50/70 dark:bg-slate-950/70 border-slate-200 dark:border-slate-700/80 focus:border-cyan-500 dark:focus:border-cyan-400 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl text-sm shadow-xs transition-colors"
                  required
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                You can find this in your payment receipt or confirmation email.
              </p>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2"
              >
                Requester Email Address
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-cyan-400/80" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="pl-11 h-12 bg-slate-50/70 dark:bg-slate-950/70 border-slate-200 dark:border-slate-700/80 focus:border-cyan-500 dark:focus:border-cyan-400 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl text-sm shadow-xs transition-colors"
                  required
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                The exact email entered when requesting the due diligence
                report.
              </p>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl bg-linear-to-r from-blue-600 via-cyan-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold text-base shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Looking up request...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Check Request Status</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Informational Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
          <Link
            href="/reva/requestform"
            className="group p-5 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/40 hover:bg-slate-50/80 dark:hover:bg-slate-900/90 shadow-sm transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                  Submit a New Request
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Need to verify a new land parcel? Get comprehensive title search
                and cadastral charting without an account.
              </p>
            </div>
            <span className="mt-3 text-xs font-semibold text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
              Start new request →
            </span>
          </Link>

          <Link
            href="/reva/login"
            className="group p-5 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/40 hover:bg-slate-50/80 dark:hover:bg-slate-900/90 shadow-sm transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                  Registered Client Dashboard
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Already have a REVA account? Sign in to view all your property
                audits, manage notifications, and view interactive maps.
              </p>
            </div>
            <span className="mt-3 text-xs font-semibold text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
              Sign in to portal →
            </span>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200 dark:border-slate-800/80 bg-slate-100/90 dark:bg-[#010813] py-6 text-center text-xs text-slate-600 dark:text-slate-400 transition-colors">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 REVA by TwoNode Technologies Limited. All rights reserved.</p>
          <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
            <Link
              href="/"
              className="hover:text-blue-600 dark:hover:text-cyan-300 transition-colors font-medium"
            >
              TwoNode Corporate Home
            </Link>
            <span>•</span>
            <Link href="/reva" className="hover:text-blue-600 dark:hover:text-cyan-300 transition-colors">
              REVA Overview
            </Link>
            <span>•</span>
            <Link href="/contact" className="hover:text-blue-600 dark:hover:text-cyan-300 transition-colors">
              Support
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
