import { getTicketByNumber } from "@/gbc/services/ticketService";
import { getCertificateVerificationUrl } from "@/gbc/services/certificatePdfService";
import { generateVerificationQRDataURL } from "@/gbc/utils/qr_code";
import { notFound } from "next/navigation";
import CertificateClient from "./CertificateClient";

interface PageProps {
  params: {
    ticketNumber: string;
  };
}

export const dynamic = "force-dynamic";

export default async function CertificatePage({ params }: PageProps) {
  const ticket = await getTicketByNumber(params.ticketNumber).catch(() => null);

  if (!ticket) {
    notFound();
  }

  const verificationUrl = getCertificateVerificationUrl(ticket.ticketNumber);
  const qrCodeDataUrl = await generateVerificationQRDataURL(verificationUrl);

  return (
    <div className="min-h-screen bg-[#FBF8F2] flex items-center justify-center p-4 sm:p-8">
      <CertificateClient
        ticket={ticket}
        verificationUrl={verificationUrl}
        qrCodeDataUrl={qrCodeDataUrl}
      />
    </div>
  );
}
