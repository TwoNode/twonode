"use client";

import { useState, useEffect } from "react";

interface Dimension {
  id: "software" | "workflow" | "room";
  name: string;
  tagline: string;
  example: string;
  color: string;
  cx: number;
  cy: number;
}

const DIMENSIONS: Record<string, Dimension> = {
  software: {
    id: "software",
    name: "Software",
    tagline: "Sometimes it's software.",
    example: "Surfboard & REVA — platforms turning manual paper records into verified data.",
    color: "#6a4cff",
    cx: 190,
    cy: 110,
  },
  workflow: {
    id: "workflow",
    name: "A Better Workflow",
    tagline: "Sometimes it's a better workflow.",
    example: "Lodgement standards & inspection rules that eliminate friction and bottlenecks.",
    color: "#0fb5a6",
    cx: 310,
    cy: 280,
  },
  room: {
    id: "room",
    name: "The Right Room",
    tagline: "Sometimes it's bringing the right people into the same room.",
    example: "GBC Summit — convening regulators, banks, and surveyors in one trusted space.",
    color: "#ff4d6d",
    cx: 90,
    cy: 280,
  },
};

export function BiggerIdea() {
  // State can be: 'software' | 'workflow' | 'room' | 'two' | 'all'
  const [activeMode, setActiveMode] = useState<"software" | "workflow" | "room" | "two" | "all">("all");
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Auto-cycles through [software -> workflow + software -> all three] to tell the visual story
  useEffect(() => {
    if (isPaused) return;
    const modes: Array<"software" | "workflow" | "room" | "two" | "all"> = [
      "software",
      "workflow",
      "two",
      "all",
    ];
    let idx = modes.indexOf(activeMode);
    const timer = setInterval(() => {
      idx = (idx + 1) % modes.length;
      setActiveMode(modes[idx]);
    }, 4000);
    return () => clearInterval(timer);
  }, [isPaused, activeMode]);

  const isSoftwareActive = activeMode === "software" || activeMode === "two" || activeMode === "all";
  const isWorkflowActive = activeMode === "workflow" || activeMode === "two" || activeMode === "all";
  const isRoomActive = activeMode === "room" || activeMode === "all";
  const isAllThree = activeMode === "all";
  const isTwo = activeMode === "two";

  return (
    <section
      className="border-b border-[#e6e4f0] dark:border-[#29273c] bg-white dark:bg-[#161524] transition-colors"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="mx-auto max-w-6xl px-6 py-20 sm:px-8 sm:py-28">
        <div className="rounded-3xl border border-[#e6e4f0] dark:border-[#29273c] bg-[#faf9ff]/60 dark:bg-[#161524] p-8 sm:p-14 shadow-xs grid gap-12 lg:grid-cols-[1.1fr_1fr] items-center">
          
          {/* Left Column: Narrative Copy */}
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#767490] dark:text-[#827e9f]">
              The Bigger Idea
            </p>
            <h2 className="mt-3 font-(family-name:--font-sora) text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#11101e] dark:text-white leading-[1.12]">
              The product is only part of the work.
            </h2>

            {/* Interactive Dimension Toggles */}
            <div className="mt-8 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveMode("software")}
                className={`rounded-full px-3.5 py-1.5 font-mono text-xs font-semibold transition-all ${
                  activeMode === "software"
                    ? "bg-[#6a4cff] text-white shadow-md"
                    : "bg-white dark:bg-[#201e33] text-[#767490] border border-[#e6e4f0] dark:border-[#29273c] hover:border-[#6a4cff]"
                }`}
              >
                1. Software
              </button>
              <button
                type="button"
                onClick={() => setActiveMode("workflow")}
                className={`rounded-full px-3.5 py-1.5 font-mono text-xs font-semibold transition-all ${
                  activeMode === "workflow"
                    ? "bg-[#0fb5a6] text-white shadow-md"
                    : "bg-white dark:bg-[#201e33] text-[#767490] border border-[#e6e4f0] dark:border-[#29273c] hover:border-[#0fb5a6]"
                }`}
              >
                2. Better Workflow
              </button>
              <button
                type="button"
                onClick={() => setActiveMode("room")}
                className={`rounded-full px-3.5 py-1.5 font-mono text-xs font-semibold transition-all ${
                  activeMode === "room"
                    ? "bg-[#ff4d6d] text-white shadow-md"
                    : "bg-white dark:bg-[#201e33] text-[#767490] border border-[#e6e4f0] dark:border-[#29273c] hover:border-[#ff4d6d]"
                }`}
              >
                3. The Right Room
              </button>
              <button
                type="button"
                onClick={() => setActiveMode("two")}
                className={`rounded-full px-3.5 py-1.5 font-mono text-xs font-semibold transition-all ${
                  activeMode === "two"
                    ? "bg-[#11101e] dark:bg-white text-white dark:text-[#11101e] shadow-md"
                    : "bg-white dark:bg-[#201e33] text-[#767490] border border-[#e6e4f0] dark:border-[#29273c]"
                }`}
              >
                Two Things
              </button>
              <button
                type="button"
                onClick={() => setActiveMode("all")}
                className={`rounded-full px-4 py-1.5 font-mono text-xs font-bold transition-all ${
                  isAllThree
                    ? "bg-linear-to-r from-[#ff4d6d] via-[#6a4cff] to-[#0fb5a6] text-white shadow-lg scale-105"
                    : "bg-white dark:bg-[#201e33] text-[#ff4d6d] border border-[#ff4d6d]/40 hover:border-[#ff4d6d]"
                }`}
              >
                ★ All Three
              </button>
            </div>

            {/* Dynamic Status / Dynamic Copy Callout */}
            <div className="mt-8 space-y-2 font-sans text-lg sm:text-xl font-medium">
              <p
                className={`transition-opacity duration-300 ${
                  isSoftwareActive
                    ? "text-[#11101e] dark:text-white font-semibold"
                    : "text-[#767490]/50 dark:text-[#827e9f]/40"
                }`}
              >
                Sometimes the answer is software.
              </p>
              <p
                className={`transition-opacity duration-300 ${
                  isWorkflowActive
                    ? "text-[#11101e] dark:text-white font-semibold"
                    : "text-[#767490]/50 dark:text-[#827e9f]/40"
                }`}
              >
                Sometimes it&apos;s a better workflow.
              </p>
              <p
                className={`transition-opacity duration-300 ${
                  isRoomActive
                    ? "text-[#11101e] dark:text-white font-semibold"
                    : "text-[#767490]/50 dark:text-[#827e9f]/40"
                }`}
              >
                Sometimes it&apos;s bringing the right people into the same room.
              </p>
              <p
                className={`font-(family-name:--font-sora) font-extrabold text-2xl transition-all duration-300 ${
                  isAllThree
                    ? "text-[#ff4d6d] scale-102"
                    : "text-[#767490]/40 dark:text-[#827e9f]/30"
                }`}
              >
                Sometimes it&apos;s all three.
              </p>
            </div>

            <p className="mt-6 max-w-xl font-sans text-sm sm:text-base leading-relaxed text-[#767490] dark:text-[#827e9f]">
              This is why Surfboard, GBC and REVA can sit alongside each other
              without TwoNode looking unfocused. The common thread isn&apos;t a
              product category — it&apos;s building whatever an industry needs to
              work better.
            </p>
          </div>

          {/* Right Column: Mind-Blowing Interactive Triad Motion Canvas */}
          <div className="relative w-full max-w-md mx-auto aspect-square flex items-center justify-center select-none">
            <svg
              className="w-full h-full overflow-visible drop-shadow-[0_16px_36px_rgba(17,16,30,0.06)] dark:drop-shadow-[0_16px_36px_rgba(0,0,0,0.4)]"
              viewBox="0 0 400 380"
              fill="none"
              aria-label="Interactive Three-Dimension Trinity"
            >
              <defs>
                <linearGradient id="tri-sw" x1="190" y1="110" x2="310" y2="280" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#6a4cff" />
                  <stop offset="100%" stopColor="#0fb5a6" />
                </linearGradient>
                <linearGradient id="tri-wr" x1="310" y1="280" x2="90" y2="280" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#0fb5a6" />
                  <stop offset="100%" stopColor="#ff4d6d" />
                </linearGradient>
                <linearGradient id="tri-rs" x1="90" y1="280" x2="190" y2="110" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#ff4d6d" />
                  <stop offset="100%" stopColor="#6a4cff" />
                </linearGradient>
                <radialGradient id="tri-core-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ff4d6d" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#6a4cff" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Triangle Connecting Edges */}
              {/* Edge: Software -> Workflow */}
              <line
                x1="190"
                y1="110"
                x2="310"
                y2="280"
                stroke={isSoftwareActive && isWorkflowActive ? "url(#tri-sw)" : "#e6e4f0"}
                strokeWidth={isSoftwareActive && isWorkflowActive ? "4" : "1.5"}
                strokeDasharray={isSoftwareActive && isWorkflowActive ? "none" : "4 4"}
                className="dark:stroke-[#29273c] transition-all duration-300"
              />
              {/* Edge: Workflow -> Room */}
              <line
                x1="310"
                y1="280"
                x2="90"
                y2="280"
                stroke={isWorkflowActive && isRoomActive ? "url(#tri-wr)" : "#e6e4f0"}
                strokeWidth={isWorkflowActive && isRoomActive ? "4" : "1.5"}
                strokeDasharray={isWorkflowActive && isRoomActive ? "none" : "4 4"}
                className="dark:stroke-[#29273c] transition-all duration-300"
              />
              {/* Edge: Room -> Software */}
              <line
                x1="90"
                y1="280"
                x2="190"
                y2="110"
                stroke={isRoomActive && isSoftwareActive ? "url(#tri-rs)" : "#e6e4f0"}
                strokeWidth={isRoomActive && isSoftwareActive ? "4" : "1.5"}
                strokeDasharray={isRoomActive && isSoftwareActive ? "none" : "4 4"}
                className="dark:stroke-[#29273c] transition-all duration-300"
              />

              {/* Radiant Center Nexus (When All Three Converge) */}
              {isAllThree && (
                <g className="transition-opacity duration-500 animate-pulse">
                  <circle cx="196" cy="223" r="54" fill="url(#tri-core-glow)" />
                  <circle
                    cx="196"
                    cy="223"
                    r="40"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    style={{ animation: "nd-orbit-spin 10s linear infinite" }}
                  />
                  <text
                    x="196"
                    y="227"
                    fontFamily="var(--font-sora), sans-serif"
                    fontSize="11"
                    fontWeight="800"
                    fill="#ffffff"
                    textAnchor="middle"
                    letterSpacing="0.5"
                  >
                    ALL THREE
                  </text>
                </g>
              )}

              {/* Node 1: Software (Top Center) */}
              <g
                className="cursor-pointer transition-transform duration-300 hover:scale-105"
                onClick={() => setActiveMode("software")}
              >
                <circle
                  cx="190"
                  cy="110"
                  r={isSoftwareActive ? "44" : "38"}
                  fill={isSoftwareActive ? "#6a4cff" : "#f1effa"}
                  stroke={isSoftwareActive ? "#ffffff" : "#d8d4ec"}
                  strokeWidth="3"
                  className="dark:fill-[#221d42] dark:stroke-[#3b3464]"
                />
                <text
                  x="190"
                  y="114"
                  fontFamily="var(--font-sora), sans-serif"
                  fontSize="12"
                  fontWeight="700"
                  fill={isSoftwareActive ? "#ffffff" : "#767490"}
                  textAnchor="middle"
                >
                  Software
                </text>
                <text
                  x="190"
                  y="140"
                  fontFamily="var(--font-mono), monospace"
                  fontSize="9"
                  fontWeight="600"
                  fill="#6a4cff"
                  textAnchor="middle"
                >
                  Surfboard · REVA
                </text>
              </g>

              {/* Node 2: A Better Workflow (Bottom Right) */}
              <g
                className="cursor-pointer transition-transform duration-300 hover:scale-105"
                onClick={() => setActiveMode("workflow")}
              >
                <circle
                  cx="310"
                  cy="280"
                  r={isWorkflowActive ? "44" : "38"}
                  fill={isWorkflowActive ? "#0fb5a6" : "#eef9f8"}
                  stroke={isWorkflowActive ? "#ffffff" : "#cdece8"}
                  strokeWidth="3"
                  className="dark:fill-[#153434] dark:stroke-[#1d504e]"
                />
                <text
                  x="310"
                  y="284"
                  fontFamily="var(--font-sora), sans-serif"
                  fontSize="12"
                  fontWeight="700"
                  fill={isWorkflowActive ? "#ffffff" : "#767490"}
                  textAnchor="middle"
                >
                  Workflow
                </text>
                <text
                  x="310"
                  y="310"
                  fontFamily="var(--font-mono), monospace"
                  fontSize="9"
                  fontWeight="600"
                  fill="#0fb5a6"
                  textAnchor="middle"
                >
                  Rules · Lodgements
                </text>
              </g>

              {/* Node 3: The Right Room (Bottom Left) */}
              <g
                className="cursor-pointer transition-transform duration-300 hover:scale-105"
                onClick={() => setActiveMode("room")}
              >
                <circle
                  cx="90"
                  cy="280"
                  r={isRoomActive ? "44" : "38"}
                  fill={isRoomActive ? "#ff4d6d" : "#fef0f2"}
                  stroke={isRoomActive ? "#ffffff" : "#fad2d8"}
                  strokeWidth="3"
                  className="dark:fill-[#381a24] dark:stroke-[#5b2434]"
                />
                <text
                  x="90"
                  y="284"
                  fontFamily="var(--font-sora), sans-serif"
                  fontSize="12"
                  fontWeight="700"
                  fill={isRoomActive ? "#ffffff" : "#767490"}
                  textAnchor="middle"
                >
                  The Room
                </text>
                <text
                  x="90"
                  y="310"
                  fontFamily="var(--font-mono), monospace"
                  fontSize="9"
                  fontWeight="600"
                  fill="#ff4d6d"
                  textAnchor="middle"
                >
                  GBC Summit
                </text>
              </g>
            </svg>
          </div>

        </div>
      </div>
    </section>
  );
}
