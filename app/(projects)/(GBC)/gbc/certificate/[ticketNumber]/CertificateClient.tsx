"use client";

import { Download } from "lucide-react";
import { format } from "date-fns";

interface CertificateClientProps {
  ticket: {
    ticketNumber: string;
    name: string;
    checkedInAt: string | Date | null;
    editionRef: {
      name: string;
      theme: string;
      subTheme: string;
      venue: string;
      startDate: string | Date;
      endDate: string | Date;
    };
  };
  verificationUrl: string;
  qrCodeDataUrl: string;
}

// Mirrors gbc/pdf-worker/certificate.render.cjs (the PDF). Every measurement
// there is in A4-landscape points (842 x 595); `pt()` converts one to a share
// of the card's width, so the page scales exactly like the PDF does. Change
// the two together.
const BG_DARK = "#160E22";
const INK = "#F7F4FB";
const PURPLE = "#C4B5FD";
const GOLD = "#C9A24B";
const MUTED = "#B4A9C4";

const pt = (n: number) => `${((n / 842) * 100).toFixed(4)}cqw`;

function nameFontSize(name: string) {
  const length = (name || "").length;
  if (length > 34) return 22;
  if (length > 24) return 28;
  return 34;
}

function CableMotif({ corner }: { corner: "topRight" | "bottomLeft" }) {
  const isTopRight = corner === "topRight";
  return (
    <svg
      viewBox="0 0 220 160"
      aria-hidden="true"
      style={{
        position: "absolute",
        top: isTopRight ? 0 : undefined,
        bottom: isTopRight ? undefined : 0,
        right: isTopRight ? 0 : undefined,
        left: isTopRight ? undefined : 0,
        width: pt(220),
        height: pt(160),
        opacity: 0.35,
        pointerEvents: "none",
      }}
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <line
          key={i}
          x1={isTopRight ? 220 : 0}
          y1={0}
          x2={isTopRight ? 220 - i * 24 : i * 24}
          y2={160}
          stroke={GOLD}
          strokeWidth={0.6}
        />
      ))}
    </svg>
  );
}

export default function CertificateClient({
  ticket,
  verificationUrl,
  qrCodeDataUrl,
}: CertificateClientProps) {
  const edition = ticket.editionRef;
  const attendedDate = ticket.checkedInAt
    ? new Date(ticket.checkedInAt)
    : new Date(edition.endDate);
  const dateRange =
    format(new Date(edition.startDate), "MMMM d") ===
    format(new Date(edition.endDate), "MMMM d")
      ? format(new Date(edition.startDate), "MMMM d, yyyy")
      : `${format(new Date(edition.startDate), "MMMM d")}–${format(new Date(edition.endDate), "d, yyyy")}`;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center">
      <div className="flex gap-4 mb-8 print:hidden">
        <a
          href={`/api/v1/gbc/tickets/${ticket.ticketNumber}/certificate-pdf`}
          download
          className="flex items-center gap-2 px-6 py-3 bg-[#5B21B6] text-white rounded-lg font-medium hover:bg-[#4c1d95] transition-colors shadow-sm"
        >
          <Download className="w-5 h-5" />
          Download PDF
        </a>
      </div>

      <div
        className="relative w-full overflow-hidden shadow-2xl print:shadow-none print:w-[297mm] print:h-[210mm] print:m-0"
        style={{
          aspectRatio: "842 / 595",
          backgroundColor: BG_DARK,
          containerType: "inline-size",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/gbc/gbcCertificateBg.jpeg"
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.22,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "#000",
            opacity: 0.4,
          }}
        />
        <CableMotif corner="topRight" />
        <CableMotif corner="bottomLeft" />
        <div
          style={{
            position: "absolute",
            inset: pt(22),
            border: `${pt(1.25)} solid ${GOLD}`,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: pt(27),
            border: `${pt(0.5)} solid #6D5490`,
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: pt(48),
            left: pt(64),
            right: pt(64),
            bottom: pt(40),
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/gbc2/gbc2LightLogo.png"
              alt="GBC 2.0"
              style={{ width: pt(90), height: pt(22.1), objectFit: "contain" }}
            />
            <p
              style={{
                fontSize: pt(8),
                fontWeight: 600,
                color: MUTED,
                letterSpacing: pt(1),
                textAlign: "right",
              }}
            >
              CERTIFICATE {ticket.ticketNumber}
            </p>
          </div>

          <div
            style={{
              flexGrow: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: pt(10),
                fontWeight: 600,
                color: GOLD,
                letterSpacing: pt(3),
                marginBottom: pt(18),
              }}
            >
              CERTIFICATE OF ATTENDANCE
            </p>
            <p
              style={{
                fontSize: pt(11),
                fontWeight: 500,
                color: MUTED,
                marginBottom: pt(10),
              }}
            >
              This certifies that
            </p>
            <h2
              style={{
                fontSize: pt(nameFontSize(ticket.name)),
                fontWeight: 800,
                color: INK,
                marginBottom: pt(16),
                paddingBottom: pt(12),
                paddingInline: pt(28),
                borderBottom: `${pt(1)} solid ${GOLD}`,
                lineHeight: 1.2,
              }}
            >
              {ticket.name}
            </h2>
            <p
              style={{
                fontSize: pt(11),
                fontWeight: 500,
                color: INK,
                lineHeight: 1.6,
                maxWidth: pt(420),
              }}
            >
              participated in{" "}
              <span style={{ fontWeight: 700, color: GOLD }}>
                {edition.name}
              </span>
              {`, held ${dateRange} at ${edition.venue}, under the theme \u201C${edition.theme}: ${edition.subTheme}.\u201D`}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                width: pt(260),
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrCodeDataUrl}
                alt="Verification QR code"
                style={{
                  width: pt(46),
                  height: pt(46),
                  marginRight: pt(10),
                  flexShrink: 0,
                }}
              />
              <div style={{ width: pt(204) }}>
                <p
                  style={{
                    fontSize: pt(8),
                    fontWeight: 600,
                    color: MUTED,
                    letterSpacing: pt(0.5),
                    marginBottom: pt(2),
                  }}
                >
                  SCAN TO VERIFY
                </p>
                <p
                  style={{
                    fontSize: pt(8),
                    fontWeight: 500,
                    color: PURPLE,
                    wordBreak: "break-all",
                  }}
                >
                  {verificationUrl.replace(/^https?:\/\//, "")}
                </p>
              </div>
            </div>

            <div
              style={{
                flexGrow: 1,
                flexBasis: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/signatures/olamide_signature_white.png"
                alt=""
                style={{
                  width: pt(100),
                  height: pt(32),
                  marginBottom: pt(-6),
                  objectFit: "contain",
                }}
              />
              <div
                style={{
                  width: pt(140),
                  borderBottom: `${pt(0.75)} solid ${MUTED}`,
                  marginBottom: pt(5),
                }}
              />
              <p
                style={{
                  fontSize: pt(8),
                  fontWeight: 600,
                  color: MUTED,
                  letterSpacing: pt(0.5),
                }}
              >
                AUTHORIZED SIGNATURE
              </p>
            </div>

            <div style={{ width: pt(230), textAlign: "right" }}>
              <p
                style={{
                  fontSize: pt(10),
                  fontWeight: 700,
                  color: INK,
                  marginBottom: pt(2),
                }}
              >
                TwoNode Technologies
              </p>
              <p style={{ fontSize: pt(8), fontWeight: 500, color: MUTED }}>
                {format(attendedDate, "MMMM d, yyyy")}
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 0;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: white;
          }
        }
      `}</style>
    </div>
  );
}
