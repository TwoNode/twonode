import { getTicketByNumber } from "@/gbc/services/ticketService";
import { notFound } from "next/navigation";
import CertificateClient from "./CertificateClient";

interface PageProps {
  params: {
    ticketNumber: string;
  };
}

export default async function CertificatePage({ params }: PageProps) {
  const ticket = await getTicketByNumber(params.ticketNumber).catch(() => null);

  if (!ticket) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-8">
      <CertificateClient ticket={ticket} />
    </div>
  );
}
