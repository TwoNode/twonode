import { getTicketByNumber } from "@/gbc/services/ticketService";
import { getCertificateVerificationUrl } from "@/gbc/services/certificatePdfService";
import { generateVerificationQRDataURL } from "@/gbc/utils/qr_code";
import { notFound } from "next/navigation";
import CertificateClient from "./CertificateClient";

interface PageProps {
  params: Promise<{
    ticketNumber: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function CertificatePage({ params }: PageProps) {
  // `params` is a Promise in Next 16. Reading it synchronously gave
  // `undefined`, which Prisma treats as "no filter", so every certificate URL
  // showed the first ticket in the table.
  const { ticketNumber } = await params;
  const ticket = await getTicketByNumber(ticketNumber).catch(() => null);

  if (!ticket) {
    notFound();
  }

  const verificationUrl = getCertificateVerificationUrl(ticket.ticketNumber);
  const qrCodeDataUrl = await generateVerificationQRDataURL(verificationUrl);

  return (
    <div className="min-h-screen bg-[#0B0613] flex items-center justify-center p-4 sm:p-8">
      <CertificateClient
        ticket={ticket}
        verificationUrl={verificationUrl}
        qrCodeDataUrl={qrCodeDataUrl}
      />
    </div>
  );
}
