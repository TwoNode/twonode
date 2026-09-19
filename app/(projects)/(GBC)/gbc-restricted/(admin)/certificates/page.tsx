import { getAttendeeStats, getTicketsPaginated } from "@/gbc/services/ticketService";
import { getEditions } from "@/gbc/services/editionService";
import { parseTicketListParams, toTicketFilters } from "@/gbc/utils/ticketListParams";
import CertificatesClient from "./CertificatesClient";

// Admin page gated by a real per-request auth check (requireAdmin) — never safe to statically prerender.
export const dynamic = "force-dynamic";

export default async function AdminCertificatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Opens on "checked in" — those are the attendees a certificate is for.
  const params = parseTicketListParams(await searchParams, { checkedIn: "yes" });
  const filters = toTicketFilters(params);

  const [result, stats, editions] = await Promise.all([
    getTicketsPaginated({
      ...filters,
      status: "COMPLETED",
      page: params.page,
      pageSize: params.pageSize,
    }),
    getAttendeeStats(filters.edition),
    getEditions(),
  ]);

  // Only what the list renders — full ticket rows carry phone/payment fields
  // this screen never shows.
  const tickets = result.data.map((t) => ({
    id: t.id,
    name: t.name,
    email: t.email,
    ticketNumber: t.ticketNumber,
    checkedIn: t.checkedIn,
    certificateSentCount: t.certificateSentCount,
  }));

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">Certificates</h1>
      <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
        Manage and send attendance certificates
      </p>

      <CertificatesClient
        tickets={tickets}
        pagination={result.pagination}
        stats={stats}
        editions={editions}
        filters={{ search: params.search, checkedIn: params.checkedIn, edition: params.edition }}
      />
    </div>
  );
}
