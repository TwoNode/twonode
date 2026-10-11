"use client";

import { useState, useEffect } from "react";

interface Step {
  num: string;
  phase: string;
  action: string;
  detail: string;
  accent: string;
}

const BUILD_STEPS: Step[] = [
  {
    num: "01",
    phase: "The work",
    action: "Go where the work is.",
    detail: "On-site desks, registry offices, field boundary stations.",
    accent: "#ff4d6d",
  },
  {
    num: "02",
    phase: "The People",
    action: "Understand their workflows.",
    detail: "Observing daily friction, manual handoffs, and human habits.",
    accent: "#6a4cff",
  },
  {
    num: "03",
    phase: "The Fracture",
    action: "Pinpoint where it breaks.",
    detail: "Lost files, opaque approvals, paper-to-digital disconnects.",
    accent: "#f59e0b",
  },
  {
    num: "04",
    phase: "Build",
    action: "Build around the gaps.",
    detail: "Engineered software and shared infrastructure that bridge it.",
    accent: "#0fb5a6",
  },
];

export function HowWeBuild() {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Auto-cycle through the 4 steps unless hovered/paused
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % BUILD_STEPS.length);
    }, 3200);
    return () => clearInterval(interval);
  }, [isPaused]);

  return (
    <section
      id="how-we-build"
      className="border-b border-[#e6e4f0] dark:border-[#29273c] bg-white dark:bg-[#161524] transition-colors"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="mx-auto max-w-6xl px-6 py-20 sm:px-8 sm:py-28">
        {/* Section Header */}
        <div className="max-w-2xl">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#767490] dark:text-[#827e9f]">
            Methodology
          </p>
          <h2 className="mt-3 font-(family-name:--font-sora) text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#11101e] dark:text-white leading-[1.15]">
            We don&apos;t build technology and then look for somewhere to put it.
          </h2>
        </div>

        {/* 4-Beat Kinetic Motion Pipeline */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          {BUILD_STEPS.map((step, idx) => {
            const isActive = activeStep === idx;
            return (
              <div
                key={step.num}
                onClick={() => setActiveStep(idx)}
                className={`cursor-pointer rounded-2xl border p-6 transition-all duration-300 relative flex flex-col justify-between ${
                  isActive
                    ? "border-[#ff4d6d] bg-[#faf9ff] dark:bg-[#1e1b34] shadow-lg -translate-y-1.5"
                    : "border-[#e6e4f0] dark:border-[#29273c] bg-white dark:bg-[#161524] opacity-80 hover:opacity-100 hover:border-[#767490]"
                }`}
              >
                <div>
                  {/* Step Header & Indicator */}
                  <div className="flex items-center justify-between">
                    <span
                      className="font-mono text-xs font-bold tracking-widest uppercase"
                      style={{ color: step.accent }}
                    >
                      {step.num} · {step.phase}
                    </span>
                    <span
                      className={`h-2 w-2 rounded-full transition-transform duration-300 ${
                        isActive ? "scale-125" : "scale-75 opacity-40"
                      }`}
                      style={{ backgroundColor: step.accent }}
                    />
                  </div>

                  {/* Visual SVG Beat Icon / Mini-Graphic */}
                  <div className="my-6 h-14 w-full flex items-center justify-center">
                    {idx === 0 && (
                      /* 01: Field Work - GPS / Ground Pin pulse */
                      <svg width="60" height="50" viewBox="0 0 60 50" fill="none">
                        <circle
                          cx="30"
                          cy="25"
                          r="18"
                          stroke={step.accent}
                          strokeWidth="1.5"
                          strokeDasharray="3 3"
                          className={isActive ? "animate-spin" : ""}
                        />
                        <circle cx="30" cy="25" r="5" fill={step.accent} />
                        <line x1="30" y1="5" x2="30" y2="15" stroke={step.accent} strokeWidth="1.5" />
                        <line x1="30" y1="35" x2="30" y2="45" stroke={step.accent} strokeWidth="1.5" />
                        <line x1="10" y1="25" x2="20" y2="25" stroke={step.accent} strokeWidth="1.5" />
                        <line x1="40" y1="25" x2="50" y2="25" stroke={step.accent} strokeWidth="1.5" />
                      </svg>
                    )}

                    {idx === 1 && (
                      /* 02: People - Communicating Human Workflows */
                      <svg width="60" height="50" viewBox="0 0 60 50" fill="none">
                        <circle cx="20" cy="22" r="8" fill={step.accent} opacity="0.9" />
                        <circle cx="40" cy="22" r="8" fill={step.accent} opacity="0.9" />
                        <path
                          d="M20 36 C20 30, 40 30, 40 36"
                          stroke={step.accent}
                          strokeWidth="2"
                          strokeDasharray="2 3"
                        />
                        <path
                          d="M25 22 L35 22"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    )}

                    {idx === 2 && (
                      /* 03: The Fracture - Break / Gap */
                      <svg width="60" height="50" viewBox="0 0 60 50" fill="none">
                        <line x1="8" y1="25" x2="24" y2="25" stroke={step.accent} strokeWidth="2.5" />
                        <line x1="36" y1="25" x2="52" y2="25" stroke={step.accent} strokeWidth="2.5" />
                        {/* Lightning zigzag fracture gap */}
                        <path
                          d="M24 25 L28 17 L32 33 L36 25"
                          stroke={step.accent}
                          strokeWidth="2"
                          strokeLinecap="round"
                          className={isActive ? "animate-pulse" : ""}
                        />
                      </svg>
                    )}

                    {idx === 3 && (
                      /* 04: Build - The TwoNode Bridge healed circuit */
                      <svg width="60" height="50" viewBox="0 0 60 50" fill="none">
                        <circle cx="14" cy="25" r="7" fill="#ff4d6d" />
                        <circle cx="46" cy="25" r="7" fill="#0fb5a6" />
                        <line
                          x1="14"
                          y1="25"
                          x2="46"
                          y2="25"
                          stroke="#0fb5a6"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                        />
                        <circle
                          cx={isActive ? "30" : "30"}
                          cy="25"
                          r="3"
                          fill="#ffffff"
                          className={isActive ? "animate-ping" : ""}
                        />
                      </svg>
                    )}
                  </div>

                  {/* Core Action */}
                  <h3 className="font-(family-name:--font-sora) text-lg font-bold tracking-tight text-[#11101e] dark:text-white">
                    {step.action}
                  </h3>
                  <p className="mt-2 font-sans text-xs sm:text-sm leading-relaxed text-[#767490] dark:text-[#a8a4c4]">
                    {step.detail}
                  </p>
                </div>

                {/* Progress bar inside active step */}
                <div className="mt-6 h-1 w-full bg-[#e6e4f0] dark:bg-[#29273c] rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isActive ? "w-full" : "w-0"
                    }`}
                    style={{ backgroundColor: step.accent }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Underline Flow Trace Beam */}
        <div className="mt-12 flex items-center justify-between text-xs font-mono text-[#767490] dark:text-[#827e9f] px-2">
          <span>FIELD REALITY</span>
          <div className="flex-1 mx-6 h-px bg-linear-to-r from-[#ff4d6d] via-[#6a4cff] to-[#0fb5a6] relative overflow-hidden">
            <div
              className="absolute top-0 bottom-0 w-24 bg-white dark:bg-white/60 blur-[1px]"
              style={{ animation: "nd-shimmer-beam 2.8s infinite ease-in-out" }}
            />
          </div>
          <span>ENDURING INFRASTRUCTURE</span>
        </div>
      </div>
    </section>
  );
}
