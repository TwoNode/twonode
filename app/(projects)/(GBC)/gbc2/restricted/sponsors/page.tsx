import { requireAdmin } from "../../../utils/auth";
import { getAllSponsors } from "../../../actions/sponsor-actions";
import { AddSponsorButton } from "../../../components/admin/AddSponsorButton";
import { SponsorsList } from "../../../components/admin/SponsorsList";
import { Sponsor } from "../../../types/sponsor";
import { Card } from "@/components/ui/card";

export default async function AdminSponsorsPage() {
  await requireAdmin();

  const sponsorsResult = await getAllSponsors();
  const sponsors: Sponsor[] = sponsorsResult.success
    ? sponsorsResult.data || []
    : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Sponsors & Partners</h1>
          <p className="text-gray-600">
            Manage conference sponsors and partners
          </p>
        </div>
        <AddSponsorButton />
      </div>

      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold">All Sponsors</h2>
            <p className="text-sm text-gray-500">
              {sponsors.length} {sponsors.length === 1 ? "sponsor" : "sponsors"}{" "}
              found
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search sponsors..."
              className="px-4 py-2 border rounded-lg text-sm w-64"
            />
            <select className="px-4 py-2 border rounded-lg text-sm bg-white">
              <option>All Tiers</option>
              <option>Platinum</option>
              <option>Gold</option>
              <option>Silver</option>
              <option>Bronze</option>
            </select>
          </div>
        </div>

        <SponsorsList sponsors={sponsors} />

        {sponsors.length === 0 && (
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
        )}
      </Card>
    </div>
  );
}
