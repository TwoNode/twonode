import { getTicketByNumber } from "@/gbc/services/ticketService";
import { getCertificateVerificationUrl } from "@/gbc/services/certificatePdfService";
import { generateVerificationQRDataURL } from "@/gbc/utils/qr_code";
import { notFound } from "next/navigation";
import { toCertificateView } from "@/gbc/utils/certificateView";
import type { Metadata } from "next";
import CertificateClient from "./CertificateClient";

interface PageProps {
  params: Promise<{
    ticketNumber: string;
  }>;
}

export const dynamic = "force-dynamic";

// ADR-0008: No-index tag so search engines do not scrape attendee names
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CertificatePage({ params }: PageProps) {
  const { ticketNumber } = await params;
  const ticket = await getTicketByNumber(ticketNumber).catch(() => null);

  const isIssued =
    ticket &&
    (ticket.certificateIssued || (ticket.certificateSentCount ?? 0) > 0);

  if (!ticket || !isIssued) {
    notFound();
  }

  const verificationUrl = getCertificateVerificationUrl(ticket.ticketNumber);
  const qrCodeDataUrl = await generateVerificationQRDataURL(verificationUrl);

  return (
    <div className="min-h-screen bg-[#0B0613] flex items-center justify-center p-4 sm:p-8">
      <CertificateClient
        ticket={toCertificateView(ticket)}
        verificationUrl={verificationUrl}
        qrCodeDataUrl={qrCodeDataUrl}
      />
    </div>
  );
}
