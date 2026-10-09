"use client";

import { useState } from "react";

export function HeroNetworkGraph() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  return (
    <div className="relative w-full aspect-square max-w-[540px] mx-auto flex items-center justify-center select-none">
      <svg
        className="w-full h-full overflow-visible drop-shadow-[0_16px_36px_rgba(17,16,30,0.06)] dark:drop-shadow-[0_16px_36px_rgba(0,0,0,0.35)]"
        viewBox="0 0 640 540"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id="hero-bridge-gradient"
            x1="250"
            y1="270"
            x2="395"
            y2="270"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#ff4d6d" />
            <stop offset="100%" stopColor="#6a4cff" />
          </linearGradient>

          <filter id="node-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Connection Edges */}
        <g stroke="#d5d3e6" strokeWidth="2" className="dark:stroke-[#29273c]">
          <line x1="120" y1="120" x2="250" y2="270" strokeDasharray="4 4" />
          <line x1="110" y1="420" x2="250" y2="270" strokeDasharray="4 4" />
          <line x1="300" y1="80" x2="250" y2="270" strokeDasharray="4 4" />
          <line x1="395" y1="270" x2="530" y2="130" strokeDasharray="4 4" />
          <line x1="395" y1="270" x2="540" y2="420" strokeDasharray="4 4" />
          <line x1="395" y1="270" x2="340" y2="480" strokeDasharray="4 4" />
        </g>

        {/* Core Bridge Connection Line */}
        <line
          x1="250"
          y1="270"
          x2="395"
          y2="270"
          stroke="url(#hero-bridge-gradient)"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Flowing Data Packet Animation across the Bridge */}
        <line
          x1="250"
          y1="270"
          x2="395"
          y2="270"
          stroke="#ffffff"
          strokeWidth="4"
          strokeDasharray="14 130"
          style={{ animation: "nd-packet-drift 2.2s linear infinite" }}
        />

        {/* Node 1 Pulse Waves (People) */}
        <circle
          cx="250"
          cy="270"
          r="110"
          fill="#ff4d6d"
          opacity="0.18"
          style={{ animation: "ndp 3s infinite" }}
        />

        {/* Node 2 Pulse Waves (Information) */}
        <circle
          cx="395"
          cy="270"
          r="110"
          fill="#6a4cff"
          opacity="0.16"
          style={{ animation: "ndp 3.6s infinite 1.2s" }}
        />

        {/* Node 1: People */}
        <g
          className="cursor-pointer transition-transform duration-300 hover:scale-105"
          onMouseEnter={() => setHoveredNode("people")}
          onMouseLeave={() => setHoveredNode(null)}
        >
          <circle cx="250" cy="270" r="64" fill="#ff4d6d" />
          <circle
            cx="250"
            cy="270"
            r="54"
            fill="none"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="2"
            strokeDasharray="6 4"
            style={{ animation: "nd-orbit-spin 18s linear infinite" }}
          />
          <text
            x="250"
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

        {/* Node 2: Information */}
        <g
          className="cursor-pointer transition-transform duration-300 hover:scale-105"
          onMouseEnter={() => setHoveredNode("information")}
          onMouseLeave={() => setHoveredNode(null)}
        >
          <circle
            cx="395"
            cy="270"
            r="64"
            fill="#ffffff"
            stroke="#11101e"
            strokeWidth="6"
            className="dark:fill-[#161524] dark:stroke-white"
          />
          <circle
            cx="395"
            cy="270"
            r="54"
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

        {/* Satellites with gentle floating motion */}
        {/* Satellite 1: Problems */}
        <g style={{ animation: "nd-float 5s ease-in-out infinite" }}>
          <circle
            cx="120"
            cy="120"
            r="30"
            fill="#ffffff"
            stroke="#dcdbea"
            strokeWidth="3"
            className="dark:fill-[#161524] dark:stroke-[#29273c]"
          />
          <circle cx="120" cy="120" r="10" fill="#ff4d6d" />
          <text
            x="120"
            y="168"
            fontFamily="var(--font-mono), monospace"
            fontSize="11"
            fill="#767490"
            textAnchor="middle"
            fontWeight="600"
            letterSpacing="1"
          >
            PROBLEMS
          </text>
        </g>

        {/* Satellite 2: Processes */}
        <g style={{ animation: "nd-float 6s ease-in-out infinite 0.8s" }}>
          <circle cx="300" cy="80" r="24" fill="#0fb5a6" />
          <text
            x="300"
            y="48"
            fontFamily="var(--font-mono), monospace"
            fontSize="11"
            fill="#067a70"
            className="dark:fill-[#2dd4bf]"
            textAnchor="middle"
            fontWeight="600"
            letterSpacing="1"
          >
            PROCESSES
          </text>
        </g>

        {/* Satellite 3: Solutions */}
        <g style={{ animation: "nd-float 5.5s ease-in-out infinite 1.4s" }}>
          <circle cx="530" cy="130" r="28" fill="#6a4cff" />
          <circle
            cx="530"
            cy="130"
            r="16"
            fill="none"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="2"
          />
          <text
            x="530"
            y="178"
            fontFamily="var(--font-mono), monospace"
            fontSize="11"
            fill="#767490"
            textAnchor="middle"
            fontWeight="600"
            letterSpacing="1"
          >
            SOLUTIONS
          </text>
        </g>

        {/* Satellite 4: Capital / Trust */}
        <g style={{ animation: "nd-float 6.2s ease-in-out infinite 2s" }}>
          <circle
            cx="110"
            cy="420"
            r="26"
            fill="#ffffff"
            stroke="#11101e"
            strokeWidth="3"
            className="dark:fill-[#161524] dark:stroke-white"
          />
          <text
            x="110"
            y="464"
            fontFamily="var(--font-mono), monospace"
            fontSize="11"
            fill="#767490"
            textAnchor="middle"
            fontWeight="600"
            letterSpacing="1"
          >
            CAPITAL
          </text>
        </g>

        {/* Satellite 5: Regulations */}
        <g style={{ animation: "nd-float 5.8s ease-in-out infinite 0.5s" }}>
          <circle cx="540" cy="420" r="32" fill="#ff4d6d" opacity="0.9" />
          <text
            x="540"
            y="472"
            fontFamily="var(--font-mono), monospace"
            fontSize="11"
            fill="#767490"
            textAnchor="middle"
            fontWeight="600"
            letterSpacing="1"
          >
            REGULATIONS
          </text>
        </g>

        {/* Satellite 6: Land & Cadastre */}
        <g style={{ animation: "nd-float 6.4s ease-in-out infinite 1.8s" }}>
          <circle
            cx="340"
            cy="480"
            r="24"
            fill="#0fb5a6"
            stroke="#ffffff"
            strokeWidth="2"
          />
          <text
            x="340"
            y="520"
            fontFamily="var(--font-mono), monospace"
            fontSize="11"
            fill="#067a70"
            className="dark:fill-[#2dd4bf]"
            textAnchor="middle"
            fontWeight="600"
            letterSpacing="1"
          >
            LAND
          </text>
        </g>
      </svg>
    </div>
  );
}
