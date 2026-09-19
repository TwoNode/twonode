import { requireAdmin } from "@/gbc/utils/auth";
import { getAllSponsors } from "@/gbc/services/cmsService";
import { getEditions } from "@/gbc/services/editionService";
import { AddSponsorButton } from "@/gbc/components/admin/AddSponsorButton";
import { SponsorsManager } from "@/gbc/components/admin/SponsorsManager";
import { Card } from "@/components/ui/card";

// Admin page gated by a real per-request auth check (requireAdmin) — never safe to statically prerender.
export const dynamic = "force-dynamic";

export default async function AdminSponsorsPage() {
  await requireAdmin();

  const [sponsors, editions] = await Promise.all([getAllSponsors(), getEditions()]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Sponsors & Partners</h1>
          <p className="text-gray-600">
            Manage conference sponsors and partners
          </p>
        </div>

        <AddSponsorButton />
      </div>

      {sponsors.length === 0 ? (
        <Card className="p-6">
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">
              No sponsors yet
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by adding your first sponsor.
            </p>
            <div className="mt-6">
              <AddSponsorButton />
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <SponsorsManager initialSponsors={sponsors} editions={editions} />
        </Card>
      )}
    </div>
  );
}
