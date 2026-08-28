import { requireAdmin } from "@/gbc/utils/auth";
import { getAllSpeakers } from "@/gbc/services/cmsService";
import { AddSpeakerButton } from "@/gbc/components/admin/AddSpeakerButton";
import { SpeakersManager } from "@/gbc/components/admin/SpeakersManager";
import { Card } from "@/components/ui/card";

// Admin page gated by a real per-request auth check (requireAdmin) — never safe to statically prerender.
export const dynamic = "force-dynamic";

export default async function AdminSpeakersPage() {
  await requireAdmin();

  const speakers = await getAllSpeakers();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Speakers</h1>
          <p className="text-gray-600">
            Manage conference speakers across all tiers
          </p>
        </div>

        <AddSpeakerButton />
      </div>

      {speakers.length === 0 ? (
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
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">
              No speakers yet
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by adding your first speaker.
            </p>
            <div className="mt-6">
              <AddSpeakerButton />
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <SpeakersManager initialSpeakers={speakers} />
        </Card>
      )}
    </div>
  );
}
