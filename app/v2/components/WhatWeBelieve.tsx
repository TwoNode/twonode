"use client";

import { useState, useEffect } from "react";

interface BeliefItem {
  id: "understand" | "build" | "connect";
  num: string;
  title: string;
  body: string;
  accent: string;
  vector: { x: number; y: number };
}

const BELIEFS: BeliefItem[] = [
  {
    id: "understand",
    num: "01",
    title: "Understand deeply",
    body: "We start with the way work actually happens.",
    accent: "#ff4d6d",
    vector: { x: 200, y: 55 },
  },
  {
    id: "build",
    num: "02",
    title: "Build simply",
    body: "Complex problems should result in simple experiences.",
    accent: "#6a4cff",
    vector: { x: 335, y: 285 },
  },
  {
    id: "connect",
    num: "03",
    title: "Connect the pieces",
    body: "Value often exists between disconnected players, systems and information.",
    accent: "#0fb5a6",
    vector: { x: 65, y: 285 },
  },
];

export function WhatWeBelieve() {
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Smooth continuous circulation around the triangle (Understand -> Build -> Connect)
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % BELIEFS.length);
    }, 3600);
    return () => clearInterval(interval);
  }, [isPaused]);

  return (
    <section
      className="border-b border-[#e6e4f0] dark:border-[#29273c] bg-white dark:bg-[#161524] transition-colors"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="mx-auto max-w-6xl px-6 py-20 sm:px-8 sm:py-28">
        <div className="max-w-2xl">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#767490] dark:text-[#827e9f]">
            What we believe
          </p>
          <h2 className="mt-3 font-(family-name:--font-sora) text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#11101e] dark:text-white leading-[1.14]">
            Industries work better when their information does.
          </h2>
        </div>

        {/* Motion Triangle Layout: Grid combining Kinetic SVG Triangle & Interactive Belief Cards */}
        <div className="mt-16 grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-12 items-center">
          
          {/* Kinetic Motion Triangle Centerpiece */}
          <div className="relative w-full max-w-105 mx-auto aspect-square flex items-center justify-center select-none">
            <svg
              className="w-full h-full overflow-visible drop-shadow-[0_16px_36px_rgba(17,16,30,0.06)] dark:drop-shadow-[0_16px_36px_rgba(0,0,0,0.4)]"
              viewBox="0 0 400 360"
              fill="none"
              aria-label="Motion Triangle: Understand, Build, Connect"
            >
              <defs>
                {/* Edge Gradients */}
                <linearGradient id="edge-ub" x1="200" y1="55" x2="335" y2="285" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#ff4d6d" />
                  <stop offset="100%" stopColor="#6a4cff" />
                </linearGradient>
                <linearGradient id="edge-bc" x1="335" y1="285" x2="65" y2="285" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#6a4cff" />
                  <stop offset="100%" stopColor="#0fb5a6" />
                </linearGradient>
                <linearGradient id="edge-cu" x1="65" y1="285" x2="200" y2="55" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#0fb5a6" />
                  <stop offset="100%" stopColor="#ff4d6d" />
                </linearGradient>
              </defs>

              {/* Triangle Background Base Track */}
              <polygon
                points="200,55 335,285 65,285"
                fill="none"
                stroke="#e6e4f0"
                strokeWidth="2"
                strokeDasharray="4 4"
                className="dark:stroke-[#29273c]"
              />

              {/* Kinetic Circulating Perimeter Energy Beam */}
              <polygon
                points="200,55 335,285 65,285"
                fill="none"
                stroke="#ff4d6d"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="90 310"
                style={{ animation: "nd-triangle-flow 4s linear infinite" }}
              />

              {/* Interior Triad Ambient Glow */}
              <circle
                cx="200"
                cy="208"
                r="70"
                fill={BELIEFS[activeIdx].accent}
                opacity="0.08"
                className="transition-colors duration-500"
              />

              {/* Center Orbit Marker */}
              <circle
                cx="200"
                cy="208"
                r="4"
                fill={BELIEFS[activeIdx].accent}
                className="transition-colors duration-300"
              />
              <text
                x="200"
                y="228"
                fontFamily="var(--font-mono), monospace"
                fontSize="10"
                fontWeight="700"
                fill="#767490"
                textAnchor="middle"
                letterSpacing="1"
              >
                THE CYCLE
              </text>

              {/* Vertex 01: Understand deeply (Top) */}
              <g
                className="cursor-pointer transition-transform duration-300 hover:scale-105"
                onClick={() => setActiveIdx(0)}
              >
                <circle
                  cx="200"
                  cy="55"
                  r={activeIdx === 0 ? "34" : "28"}
                  fill={activeIdx === 0 ? "#ff4d6d" : "#ffffff"}
                  stroke="#ff4d6d"
                  strokeWidth="3"
                  className={activeIdx === 0 ? "" : "dark:fill-[#161524]"}
                />
                <text
                  x="200"
                  y="59"
                  fontFamily="var(--font-sora), sans-serif"
                  fontSize="12"
                  fontWeight="800"
                  fill={activeIdx === 0 ? "#ffffff" : "#ff4d6d"}
                  textAnchor="middle"
                >
                  01
                </text>
                <text
                  x="200"
                  y="18"
                  fontFamily="var(--font-sora), sans-serif"
                  fontSize="11"
                  fontWeight="700"
                  fill="#11101e"
                  className="dark:fill-white"
                  textAnchor="middle"
                >
                  Understand
                </text>
              </g>

              {/* Vertex 02: Build simply (Bottom-Right) */}
              <g
                className="cursor-pointer transition-transform duration-300 hover:scale-105"
                onClick={() => setActiveIdx(1)}
              >
                <circle
                  cx="335"
                  cy="285"
                  r={activeIdx === 1 ? "34" : "28"}
                  fill={activeIdx === 1 ? "#6a4cff" : "#ffffff"}
                  stroke="#6a4cff"
                  strokeWidth="3"
                  className={activeIdx === 1 ? "" : "dark:fill-[#161524]"}
                />
                <text
                  x="335"
                  y="289"
                  fontFamily="var(--font-sora), sans-serif"
                  fontSize="12"
                  fontWeight="800"
                  fill={activeIdx === 1 ? "#ffffff" : "#6a4cff"}
                  textAnchor="middle"
                >
                  02
                </text>
                <text
                  x="335"
                  y="332"
                  fontFamily="var(--font-sora), sans-serif"
                  fontSize="11"
                  fontWeight="700"
                  fill="#11101e"
                  className="dark:fill-white"
                  textAnchor="middle"
                >
                  Build Simply
                </text>
              </g>

              {/* Vertex 03: Connect the pieces (Bottom-Left) */}
              <g
                className="cursor-pointer transition-transform duration-300 hover:scale-105"
                onClick={() => setActiveIdx(2)}
              >
                <circle
                  cx="65"
                  cy="285"
                  r={activeIdx === 2 ? "34" : "28"}
                  fill={activeIdx === 2 ? "#0fb5a6" : "#ffffff"}
                  stroke="#0fb5a6"
                  strokeWidth="3"
                  className={activeIdx === 2 ? "" : "dark:fill-[#161524]"}
                />
                <text
                  x="65"
                  y="289"
                  fontFamily="var(--font-sora), sans-serif"
                  fontSize="12"
                  fontWeight="800"
                  fill={activeIdx === 2 ? "#ffffff" : "#0fb5a6"}
                  textAnchor="middle"
                >
                  03
                </text>
                <text
                  x="65"
                  y="332"
                  fontFamily="var(--font-sora), sans-serif"
                  fontSize="11"
                  fontWeight="700"
                  fill="#11101e"
                  className="dark:fill-white"
                  textAnchor="middle"
                >
                  Connect
                </text>
              </g>
            </svg>
          </div>

          {/* Interactive Synchronized Principle Cards */}
          <div className="space-y-4">
            {BELIEFS.map((b, idx) => {
              const isActive = activeIdx === idx;
              return (
                <div
                  key={b.title}
                  onClick={() => setActiveIdx(idx)}
                  className={`cursor-pointer rounded-2xl border p-6 transition-all duration-300 ${
                    isActive
                      ? "border-[#ff4d6d] bg-[#faf9ff] dark:bg-[#1e1b34] shadow-md -translate-x-1"
                      : "border-[#e6e4f0] dark:border-[#29273c] bg-white dark:bg-[#161524] opacity-75 hover:opacity-100 hover:border-[#767490]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="font-mono text-xs font-bold tracking-widest"
                      style={{ color: b.accent }}
                    >
                      PRINCIPLE {b.num}
                    </span>
                    <span
                      className={`h-2 w-2 rounded-full transition-transform duration-300 ${
                        isActive ? "scale-125" : "scale-75 opacity-40"
                      }`}
                      style={{ backgroundColor: b.accent }}
                    />
                  </div>
                  <h3 className="mt-3 font-(family-name:--font-sora) text-xl font-bold tracking-tight text-[#11101e] dark:text-white">
                    {b.title}
                  </h3>
                  <p className="mt-2 font-sans text-sm sm:text-base leading-relaxed text-[#48455e] dark:text-[#b8b5d0]">
                    {b.body}
                  </p>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </section>
  );
}
