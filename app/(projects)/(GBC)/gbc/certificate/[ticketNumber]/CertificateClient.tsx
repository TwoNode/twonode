"use client";

import { useState } from "react";
import {
  Download,
  ShieldCheck,
  Mail,
  KeyRound,
  X,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { format } from "date-fns";
import { fitName } from "@/gbc/utils/certificateName";

interface CertificateClientProps {
  ticket: {
    ticketNumber: string;
    name: string;
    checkedInAt: string | Date | null;
    certificateEventName?: string | null;
    certificateTheme?: string | null;
    certificateSubTheme?: string | null;
    certificateVenue?: string | null;
    certificateStartDate?: string | Date | null;
    certificateEndDate?: string | Date | null;
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
  // ADR-0008: Read frozen edition fields if present, else fall back to editionRef
  const edition = {
    name: ticket.certificateEventName || ticket.editionRef.name,
    theme: ticket.certificateTheme || ticket.editionRef.theme,
    subTheme: ticket.certificateSubTheme || ticket.editionRef.subTheme,
    venue: ticket.certificateVenue || ticket.editionRef.venue,
    startDate: ticket.certificateStartDate || ticket.editionRef.startDate,
    endDate: ticket.certificateEndDate || ticket.editionRef.endDate,
  };

  const nameFit = fitName(ticket.name);
  const attendedDate = ticket.checkedInAt
    ? new Date(ticket.checkedInAt)
    : new Date(edition.endDate);
  const dateRange =
    format(new Date(edition.startDate), "MMMM d") ===
    format(new Date(edition.endDate), "MMMM d")
      ? format(new Date(edition.startDate), "MMMM d, yyyy")
      : `${format(new Date(edition.startDate), "MMMM d")}–${format(new Date(edition.endDate), "d, yyyy")}`;

  // Download OTP modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState<"email" | "code" | "success">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfoMessage(null);

    try {
      const res = await fetch("/api/v1/gbc/certificates/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to request code");
      }

      setInfoMessage(data.message);
      setStep("code");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to request code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/gbc/certificates/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error || data.message || "Invalid verification code"
        );
      }

      setStep("success");
      // Download with the short-lived token in a POST body (never in the URL)
      const pdfRes = await fetch("/api/v1/gbc/certificates/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: data.data.token,
          ticketNumber: ticket.ticketNumber,
        }),
      });
      if (!pdfRes.ok) {
        throw new Error(
          "Could not download the certificate. Please try again."
        );
      }
      const blobUrl = URL.createObjectURL(await pdfRes.blob());
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `GBC-Certificate-${ticket.ticketNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to verify code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center">
      {/* Top Banner: Verification badge and Holder Download button */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 print:hidden px-2">
        <div className="flex items-center gap-2.5 px-4 py-2 bg-[#1C122C] border border-[#3B2556] rounded-full text-sm font-medium text-[#D8B4FE] shadow-sm">
          <ShieldCheck className="w-5 h-5 text-[#C9A24B]" />
          <span>Verified Certificate of Attendance</span>
        </div>

        <button
          onClick={() => {
            setIsModalOpen(true);
            setStep("email");
            setError(null);
            setInfoMessage(null);
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#5B21B6] text-white rounded-lg font-medium hover:bg-[#4c1d95] transition-colors shadow-sm text-sm"
        >
          <Download className="w-4 h-4" />
          Are you the holder? Request certificate copy
        </button>
      </div>

      {/* Main Certificate Display Canvas */}
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
                fontSize: pt(nameFit.size),
                fontWeight: 800,
                color: INK,
                marginBottom: pt(16),
                paddingBottom: pt(12),
                paddingInline: pt(28),
                borderBottom: `${pt(1)} solid ${GOLD}`,
                lineHeight: 1.15,
                whiteSpace: "pre-line",
              }}
            >
              {nameFit.lines.join("\n")}
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

      {/* Download OTP Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-[#160E22] border border-[#3B2556] rounded-xl shadow-2xl p-6 text-white">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-[#5B21B6]/30 border border-[#7C3AED]/40 rounded-lg text-[#C4B5FD]">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-white">
                  Download Certificate
                </h3>
                <p className="text-xs text-[#B4A9C4]">
                  Certificate for {ticket.ticketNumber}
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-200 text-xs">
                {error}
              </div>
            )}

            {infoMessage && (
              <div className="mb-4 p-3 bg-purple-900/30 border border-purple-700/50 rounded-lg text-purple-200 text-xs">
                {infoMessage}
              </div>
            )}

            {step === "email" && (
              <form onSubmit={handleRequestCode} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#B4A9C4] mb-1.5">
                    Ticket Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter the email associated with your ticket"
                    className="w-full px-3.5 py-2.5 bg-[#0B0613] border border-[#3B2556] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7C3AED]"
                  />
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    For privacy, a 6-digit code will be emailed only if an
                    issued certificate exists for this address.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#5B21B6] hover:bg-[#4c1d95] text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Send Verification Code"
                  )}
                </button>
              </form>
            )}

            {step === "code" && (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#B4A9C4] mb-1.5">
                    Enter 6-Digit Code
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      pattern="[0-9]{6}"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="123456"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-[#0B0613] border border-[#3B2556] rounded-lg text-sm text-white tracking-widest placeholder-gray-600 focus:outline-none focus:border-[#7C3AED]"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    Code expires in 10 minutes and is single-use.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setError(null);
                    }}
                    className="px-3 py-2.5 bg-transparent border border-[#3B2556] hover:bg-white/5 text-gray-300 rounded-lg text-xs"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || code.length !== 6}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#5B21B6] hover:bg-[#4c1d95] text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Verify & Download PDF"
                    )}
                  </button>
                </div>
              </form>
            )}

            {step === "success" && (
              <div className="text-center py-4 space-y-3">
                <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
                <h4 className="font-semibold text-white">Code Verified!</h4>
                <p className="text-xs text-gray-300">
                  Your certificate PDF download has started.
                </p>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-[#5B21B6] text-white rounded-lg text-xs mt-2"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
