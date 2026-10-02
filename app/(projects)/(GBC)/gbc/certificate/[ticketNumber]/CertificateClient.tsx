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

      <div className="relative w-full aspect-[1.414] bg-[#FBF8F2] shadow-2xl overflow-hidden print:shadow-none print:w-[297mm] print:h-[210mm] print:m-0">
        {/* Cable-motif corners — placeholder for the bridge-photo background */}
        <svg
          className="absolute top-0 right-0 w-40 h-32 sm:w-56 sm:h-44 opacity-30 pointer-events-none"
          viewBox="0 0 220 160"
        >
          {Array.from({ length: 9 }).map((_, i) => (
            <line
              key={i}
              x1={220}
              y1={0}
              x2={220 - i * 24}
              y2={160}
              stroke="#C9A24B"
              strokeWidth={0.8}
            />
          ))}
        </svg>
        <svg
          className="absolute bottom-0 left-0 w-40 h-32 sm:w-56 sm:h-44 opacity-30 pointer-events-none"
          viewBox="0 0 220 160"
        >
          {Array.from({ length: 9 }).map((_, i) => (
            <line
              key={i}
              x1={0}
              y1={0}
              x2={i * 24}
              y2={160}
              stroke="#C9A24B"
              strokeWidth={0.8}
            />
          ))}
        </svg>

        <div className="absolute inset-3 sm:inset-5 border border-[#C9A24B] pointer-events-none" />
        <div className="absolute inset-4 sm:inset-6 border border-[#5B21B6]/60 pointer-events-none" />

        <div className="relative h-full flex flex-col p-8 sm:p-14">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm sm:text-base font-extrabold tracking-wide text-[#1A1024]">
                {edition.name.toUpperCase()}
              </p>
              <p className="text-[10px] sm:text-xs font-medium text-[#6B6472] tracking-wide mt-0.5">
                GEOSPATIAL BUILDERS COURSE · TWONODE TECHNOLOGIES
              </p>
            </div>
            <p className="text-[10px] sm:text-xs font-semibold text-[#6B6472] tracking-wide">
              CERTIFICATE {ticket.ticketNumber}
            </p>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <p className="text-[10px] sm:text-xs font-semibold text-[#C9A24B] tracking-[0.2em] mb-3 sm:mb-4">
              CERTIFICATE OF ATTENDANCE
            </p>
            <p className="text-xs sm:text-sm font-medium text-[#6B6472] mb-2">
              This certifies that
            </p>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-[#1A1024] mb-4 sm:mb-6 border-b border-[#C9A24B] pb-3 px-8 sm:px-16">
              {ticket.name}
            </h2>
            <p className="text-[#1A1024] text-sm sm:text-base max-w-2xl leading-relaxed font-medium">
              participated in{" "}
              <span className="font-bold text-[#5B21B6]">{edition.name}</span>,
              held {dateRange} at {edition.venue}, under the theme &ldquo;
              {edition.theme}&rdquo; — {edition.subTheme}.
            </p>
          </div>

          <div className="flex justify-between items-end">
            <div className="flex items-center gap-2 sm:gap-3">
              <img
                src={qrCodeDataUrl}
                alt="Verification QR code"
                className="w-10 h-10 sm:w-14 sm:h-14"
              />
              <div className="text-left">
                <p className="text-[9px] sm:text-[10px] font-semibold text-[#6B6472] tracking-wide">
                  SCAN TO VERIFY
                </p>
                <p className="text-[9px] sm:text-[10px] font-medium text-[#5B21B6] break-all">
                  {verificationUrl.replace(/^https?:\/\//, "")}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs sm:text-sm font-bold text-[#1A1024]">
                TwoNode Technologies
              </p>
              <p className="text-[9px] sm:text-[10px] font-medium text-[#6B6472]">
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
