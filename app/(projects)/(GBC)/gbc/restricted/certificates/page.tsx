import { getGBCTickets } from "../../../actions/ticket-actions";
import CertificatesClient from "./CertificatesClient";

// Admin page gated by a real per-request auth check (requireAdmin) — never safe to statically prerender.
export const dynamic = "force-dynamic";

export default async function AdminCertificatesPage() {
  const ticketsResult = await getGBCTickets({ status: "COMPLETED" });
  const tickets = (ticketsResult.success && ticketsResult.data) ? ticketsResult.data : [];

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">Certificates</h1>
      <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
        Manage and send attendance certificates
      </p>

      <CertificatesClient initialTickets={tickets} />
    </div>
  );
}
