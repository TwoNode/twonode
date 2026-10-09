import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getSiteUrl } from "@/lib/siteUrl";
import { generateVerificationQRDataURL } from "@/gbc/utils/qr_code";
import CertificateClient from "../../certificate/[ticketNumber]/CertificateClient";

interface VerifyPageProps {
  params: Promise<{
    publicId: string;
  }>;
}

export const dynamic = "force-dynamic";

// ADR-0008: Public verification endpoint using unguessable 128-bit publicId
export default async function CertificateVerifyPage({
  params,
}: VerifyPageProps) {
  const { publicId } = await params;
  if (!publicId) {
    notFound();
  }

  const ticket = await prisma.gBCTicket.findUnique({
    where: { certificatePublicId: publicId },
    include: { editionRef: true },
  });

  const isIssued =
    ticket &&
    (ticket.certificateIssued || (ticket.certificateSentCount ?? 0) > 0);

  if (!ticket || !isIssued) {
    notFound();
  }

  const verificationUrl = `${getSiteUrl()}/gbc/verify/${publicId}`;
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
