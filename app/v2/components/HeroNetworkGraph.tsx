"use client";

import { useState } from "react";

interface NodeDetail {
  id: string;
  name: string;
  role: string;
  category: "core" | "satellite";
  description: string;
}

const NODES_DATA: Record<string, NodeDetail> = {
  people: {
    id: "people",
    name: "People",
    role: "Core Node 01",
    category: "core",
    description: "The practitioners, regulators, surveyors, and operators doing the ground work.",
  },
  information: {
    id: "information",
    name: "Information",
    role: "Core Node 02",
    category: "core",
    description: "Spatial data, verified land records, legal titles, and institutional memory.",
  },
  problems: {
    id: "problems",
    name: "Problems",
    role: "Ecosystem Dimension",
    category: "satellite",
    description: "Paper silos, friction, slow lodgements, and opaque manual workflows.",
  },
  systems: {
    id: "systems",
    name: "Systems",
    role: "Ecosystem Dimension",
    category: "satellite",
    description: "Legacy software, registry archives, fragmented databases, and protocols.",
  },
  relationships: {
    id: "relationships",
    name: "Relationships",
    role: "Ecosystem Dimension",
    category: "satellite",
    description: "Inter-agency dependencies between ministries, surveyors, and citizens.",
  },
  opportunities: {
    id: "opportunities",
    name: "Opportunities",
    role: "Ecosystem Dimension",
    category: "satellite",
    description: "Accelerated transaction velocity, transparent tenure, and shared liquidity.",
  },
};

export function HeroNetworkGraph() {
  const [activeNode, setActiveNode] = useState<string | null>(null);

  const activeDetail = activeNode ? NODES_DATA[activeNode] : null;

  return (
    <div className="relative w-full max-w-140 mx-auto flex flex-col items-center select-none">
      <div className="relative w-full aspect-square flex items-center justify-center">
        <svg
          className="w-full h-full overflow-visible drop-shadow-[0_20px_40px_rgba(17,16,30,0.06)] dark:drop-shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
          viewBox="0 0 640 540"
          fill="none"
          aria-label="TwoNode Ecosystem Motion Network"
        >
          <defs>
            <linearGradient
              id="hero-bridge-gradient"
              x1="245"
              y1="270"
              x2="395"
              y2="270"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#ff4d6d" />
              <stop offset="100%" stopColor="#6a4cff" />
            </linearGradient>

            {/* Glowing filter for nodes and bridge */}
            <filter id="bridge-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Inward Inflow Threads: Understanding the outer ecosystem into the core nodes */}
          <g className="transition-opacity duration-300">
            {/* Problems -> People */}
            <line
              x1="120"
              y1="130"
              x2="245"
              y2="270"
              stroke="#ff4d6d"
              strokeWidth={activeNode === "problems" ? "2.5" : "1.5"}
              strokeOpacity={activeNode && activeNode !== "problems" ? "0.2" : "0.5"}
              strokeDasharray="4 6"
              style={{ animation: "nd-inward-stream 3s linear infinite" }}
            />
            {/* Relationships -> People */}
            <line
              x1="120"
              y1="410"
              x2="245"
              y2="270"
              stroke="#ff4d6d"
              strokeWidth={activeNode === "relationships" ? "2.5" : "1.5"}
              strokeOpacity={activeNode && activeNode !== "relationships" ? "0.2" : "0.5"}
              strokeDasharray="4 6"
              style={{ animation: "nd-inward-stream 3.4s linear infinite" }}
            />
            {/* Systems -> Information */}
            <line
              x1="520"
              y1="130"
              x2="395"
              y2="270"
              stroke="#6a4cff"
              strokeWidth={activeNode === "systems" ? "2.5" : "1.5"}
              strokeOpacity={activeNode && activeNode !== "systems" ? "0.2" : "0.5"}
              strokeDasharray="4 6"
              style={{ animation: "nd-inward-stream 3.2s linear infinite" }}
            />
            {/* Opportunities -> Information */}
            <line
              x1="520"
              y1="410"
              x2="395"
              y2="270"
              stroke="#0fb5a6"
              strokeWidth={activeNode === "opportunities" ? "2.5" : "1.5"}
              strokeOpacity={activeNode && activeNode !== "opportunities" ? "0.2" : "0.5"}
              strokeDasharray="4 6"
              style={{ animation: "nd-inward-stream 2.8s linear infinite" }}
            />

            {/* Subtle Cross-links showing ecosystem interdependencies */}
            <line
              x1="120"
              y1="130"
              x2="520"
              y2="130"
              stroke="#d5d3e6"
              strokeWidth="1"
              strokeDasharray="3 5"
              strokeOpacity="0.4"
              className="dark:stroke-[#29273c]"
            />
            <line
              x1="120"
              y1="410"
              x2="520"
              y2="410"
              stroke="#d5d3e6"
              strokeWidth="1"
              strokeDasharray="3 5"
              strokeOpacity="0.4"
              className="dark:stroke-[#29273c]"
            />
          </g>

          {/* Central TwoNode Bridge (Then We Build) */}
          <line
            x1="245"
            y1="270"
            x2="395"
            y2="270"
            stroke="url(#hero-bridge-gradient)"
            strokeWidth="7"
            strokeLinecap="round"
            filter="url(#bridge-glow)"
          />

          {/* High-velocity data packet flow across the bridge */}
          <line
            x1="245"
            y1="270"
            x2="395"
            y2="270"
            stroke="#ffffff"
            strokeWidth="4"
            strokeDasharray="18 132"
            style={{ animation: "nd-packet-drift 1.8s linear infinite" }}
          />

          {/* Core Node Pulse Rings */}
          <circle
            cx="245"
            cy="270"
            r="105"
            fill="#ff4d6d"
            opacity="0.14"
            style={{ animation: "ndp 3s infinite" }}
          />
          <circle
            cx="395"
            cy="270"
            r="105"
            fill="#6a4cff"
            opacity="0.12"
            style={{ animation: "ndp 3.6s infinite 1.2s" }}
          />

          {/* Core Node 1: People */}
          <g
            className="cursor-pointer transition-transform duration-300 hover:scale-105"
            onMouseEnter={() => setActiveNode("people")}
            onMouseLeave={() => setActiveNode(null)}
          >
            <circle
              cx="245"
              cy="270"
              r="62"
              fill="#ff4d6d"
              stroke={activeNode === "people" ? "#ffffff" : "transparent"}
              strokeWidth="3"
            />
            <circle
              cx="245"
              cy="270"
              r="52"
              fill="none"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="2"
              strokeDasharray="6 4"
              style={{ animation: "nd-orbit-spin 18s linear infinite" }}
            />
            <text
              x="245"
              y="276"
              fontFamily="var(--font-sora), sans-serif"
              fontWeight="700"
              fontSize="16"
              fill="#ffffff"
              textAnchor="middle"
            >
              people
            </text>
          </g>

          {/* Core Node 2: Information */}
          <g
            className="cursor-pointer transition-transform duration-300 hover:scale-105"
            onMouseEnter={() => setActiveNode("information")}
            onMouseLeave={() => setActiveNode(null)}
          >
            <circle
              cx="395"
              cy="270"
              r="62"
              fill="#ffffff"
              stroke={activeNode === "information" ? "#6a4cff" : "#11101e"}
              strokeWidth="5"
              className="dark:fill-[#161524] dark:stroke-white"
            />
            <circle
              cx="395"
              cy="270"
              r="52"
              fill="none"
              stroke="#6a4cff"
              strokeWidth="2"
              strokeDasharray="6 4"
              style={{ animation: "nd-orbit-spin 14s linear infinite reverse" }}
            />
            <text
              x="395"
              y="276"
              fontFamily="var(--font-sora), sans-serif"
              fontWeight="700"
              fontSize="15"
              fill="#11101e"
              className="dark:fill-white"
              textAnchor="middle"
            >
              information
            </text>
          </g>

          {/* ========================================================= */}
          {/* SATELLITE 1: PROBLEMS (Top-Left)                          */}
          {/* ========================================================= */}
          <g
            className="cursor-pointer transition-transform duration-300 hover:scale-110"
            onMouseEnter={() => setActiveNode("problems")}
            onMouseLeave={() => setActiveNode(null)}
            style={{ animation: "nd-float 5s ease-in-out infinite" }}
          >
            <circle
              cx="120"
              cy="130"
              r="32"
              fill="#ffffff"
              stroke={activeNode === "problems" ? "#ff4d6d" : "#e0dee9"}
              strokeWidth="2.5"
              className="dark:fill-[#161524] dark:stroke-[#29273c]"
            />
            <circle cx="120" cy="130" r="10" fill="#ff4d6d" />
            <text
              x="120"
              y="180"
              fontFamily="var(--font-mono), monospace"
              fontSize="10.5"
              fill="#767490"
              textAnchor="middle"
              fontWeight="700"
              letterSpacing="1"
            >
              PROBLEMS
            </text>
          </g>

          {/* ========================================================= */}
          {/* SATELLITE 2: SYSTEMS (Top-Right)                         */}
          {/* ========================================================= */}
          <g
            className="cursor-pointer transition-transform duration-300 hover:scale-110"
            onMouseEnter={() => setActiveNode("systems")}
            onMouseLeave={() => setActiveNode(null)}
            style={{ animation: "nd-float 5.8s ease-in-out infinite 0.6s" }}
          >
            <circle
              cx="520"
              cy="130"
              r="32"
              fill="#ffffff"
              stroke={activeNode === "systems" ? "#6a4cff" : "#e0dee9"}
              strokeWidth="2.5"
              className="dark:fill-[#161524] dark:stroke-[#29273c]"
            />
            <circle cx="520" cy="130" r="10" fill="#6a4cff" />
            <text
              x="520"
              y="180"
              fontFamily="var(--font-mono), monospace"
              fontSize="10.5"
              fill="#767490"
              textAnchor="middle"
              fontWeight="700"
              letterSpacing="1"
            >
              SYSTEMS
            </text>
          </g>

          {/* ========================================================= */}
          {/* SATELLITE 3: RELATIONSHIPS (Bottom-Left)                  */}
          {/* ========================================================= */}
          <g
            className="cursor-pointer transition-transform duration-300 hover:scale-110"
            onMouseEnter={() => setActiveNode("relationships")}
            onMouseLeave={() => setActiveNode(null)}
            style={{ animation: "nd-float 6.2s ease-in-out infinite 1.2s" }}
          >
            <circle
              cx="120"
              cy="410"
              r="32"
              fill="#ffffff"
              stroke={activeNode === "relationships" ? "#ff4d6d" : "#e0dee9"}
              strokeWidth="2.5"
              className="dark:fill-[#161524] dark:stroke-[#29273c]"
            />
            <circle cx="120" cy="410" r="10" fill="#ff758f" />
            <text
              x="120"
              y="460"
              fontFamily="var(--font-mono), monospace"
              fontSize="10.5"
              fill="#767490"
              textAnchor="middle"
              fontWeight="700"
              letterSpacing="1"
            >
              RELATIONSHIPS
            </text>
          </g>

          {/* ========================================================= */}
          {/* SATELLITE 4: OPPORTUNITIES (Bottom-Right)                */}
          {/* ========================================================= */}
          <g
            className="cursor-pointer transition-transform duration-300 hover:scale-110"
            onMouseEnter={() => setActiveNode("opportunities")}
            onMouseLeave={() => setActiveNode(null)}
            style={{ animation: "nd-float 5.4s ease-in-out infinite 1.8s" }}
          >
            <circle
              cx="520"
              cy="410"
              r="32"
              fill="#ffffff"
              stroke={activeNode === "opportunities" ? "#0fb5a6" : "#e0dee9"}
              strokeWidth="2.5"
              className="dark:fill-[#161524] dark:stroke-[#29273c]"
            />
            <circle cx="520" cy="410" r="10" fill="#0fb5a6" />
            <text
              x="520"
              y="460"
              fontFamily="var(--font-mono), monospace"
              fontSize="10.5"
              fill="#067a70"
              className="dark:fill-[#2dd4bf]"
              textAnchor="middle"
              fontWeight="700"
              letterSpacing="1"
            >
              OPPORTUNITIES
            </text>
          </g>
        </svg>
      </div>

      {/* Kinetic Narrative Telemetry / Inspection HUD */}
      <div className="mt-2 w-full max-w-md rounded-2xl border border-[#e6e4f0] dark:border-[#29273c] bg-white/80 dark:bg-[#161524]/80 backdrop-blur-md px-4 py-2.5 text-center shadow-xs transition-all duration-300">
        {activeDetail ? (
          <div>
            <div className="flex items-center justify-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-[#ff4d6d]">
              <span>[{activeDetail.role}]</span>
              <span>{activeDetail.name}</span>
            </div>
            <p className="mt-1 font-sans text-xs text-[#48455e] dark:text-[#b8b5d0] leading-snug">
              {activeDetail.description}
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 font-mono text-[11px] text-[#767490] dark:text-[#827e9f]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#0fb5a6] animate-pulse" />
            <span>1. Understand the 6 dimensions → 2. Build the bridge</span>
          </div>
        )}
      </div>
    </div>
  );
}
