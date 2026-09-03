// Simple, self-contained SVG illustrations for the QR Earnings paywall
// "more info" popovers. Kept as inline React components (no external
// assets) so they render crisply at any size and match the modal's theme.

export function Service1Illustration() {
  return (
    <svg
      viewBox="0 0 160 120"
      width="160"
      height="120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="160" height="120" rx="12" fill="#0f172a" />
      {/* map grid */}
      <g stroke="#1e3a8a" strokeWidth="1" opacity="0.6">
        <path d="M0 40h160M0 80h160M40 0v120M100 0v120" />
      </g>
      {/* road */}
      <path
        d="M10 100 C 40 60, 60 100, 90 60 S 140 30, 150 20"
        stroke="#38bdf8"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* location pin */}
      <g transform="translate(78, 34)">
        <circle cx="0" cy="0" r="22" fill="#2563eb" opacity="0.15" />
        <path
          d="M0 -18c8.28 0 15 6.72 15 15 0 11.25-15 27-15 27S-15 8.25-15 -3c0-8.28 6.72-15 15-15z"
          fill="#3b82f6"
        />
        <circle cx="0" cy="-3" r="6" fill="#0f172a" />
      </g>
      {/* magnifier / authenticity check */}
      <g transform="translate(118, 78)">
        <circle cx="0" cy="0" r="10" stroke="#a5b4fc" strokeWidth="2.5" fill="#1e293b" />
        <path d="M7 7 L14 14" stroke="#a5b4fc" strokeWidth="2.5" strokeLinecap="round" />
        <path
          d="M-4 0 l3 3 l6 -6"
          stroke="#4ade80"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
    </svg>
  );
}

export function Service2Illustration() {
  return (
    <svg
      viewBox="0 0 160 120"
      width="160"
      height="120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="160" height="120" rx="12" fill="#0f172a" />
      {/* certificate document */}
      <g transform="translate(38, 14)">
        <rect
          x="0"
          y="0"
          width="70"
          height="92"
          rx="6"
          fill="#1e1b4b"
          stroke="#6366f1"
          strokeWidth="1.5"
        />
        <rect x="10" y="14" width="50" height="5" rx="2.5" fill="#818cf8" opacity="0.8" />
        <rect x="10" y="26" width="38" height="4" rx="2" fill="#4c1d95" />
        <rect x="10" y="34" width="42" height="4" rx="2" fill="#4c1d95" />
        <rect x="10" y="42" width="30" height="4" rx="2" fill="#4c1d95" />
        {/* seal ribbon */}
        <g transform="translate(35, 68)">
          <circle cx="0" cy="0" r="16" fill="#4f46e5" />
          <circle cx="0" cy="0" r="16" fill="none" stroke="#a5b4fc" strokeDasharray="2 3" strokeWidth="1.5" />
          <path
            d="M-5 0 l3.5 3.5 l7 -8"
            stroke="#e0e7ff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path d="M-8 12 L-13 24 L-4 19 Z" fill="#4f46e5" />
          <path d="M8 12 L13 24 L4 19 Z" fill="#4f46e5" />
        </g>
      </g>
      {/* sparkle accents */}
      <g fill="#c7d2fe">
        <circle cx="20" cy="20" r="2" />
        <circle cx="140" cy="30" r="2.5" />
        <circle cx="128" cy="90" r="1.8" />
      </g>
    </svg>
  );
}
