import { lookupMyTicket } from "@/gbc/services/ticketService";
import { getEditions } from "@/gbc/services/editionService";
import TicketLookupForm from "./TicketLookupForm";
import MyTicketView from "./MyTicketView";

export const metadata = {
  title: "My Ticket - GBC",
};

// Real per-request DB lookup driven by searchParams — never safe to statically prerender.
export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ ticketNumber?: string; email?: string }> };

export default async function MyTicketPage({ searchParams }: PageProps) {
  const { ticketNumber, email } = await searchParams;

  if (!ticketNumber || !email) {
    return <TicketLookupForm />;
  }

  try {
    const ticket = await lookupMyTicket(ticketNumber, email);
    const editions = await getEditions();
    const edition = editions.find((e) => e.key === ticket.edition) ?? null;
    return <MyTicketView ticket={ticket} edition={edition} />;
  } catch {
    return <TicketLookupForm notFound />;
  }
}
