import { getEditions } from "@/gbc/services/editionService";
import EditionsClient from "./EditionsClient";

// Admin page — never safe to statically prerender (real per-request data via the API client).
export const dynamic = "force-dynamic";

export default async function AdminEditionsPage() {
  const editions = await getEditions();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Editions</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          Switch between conference years, review past performance, and manage the active edition.
        </p>
      </div>

      <EditionsClient initialEditions={editions} />
    </div>
  );
}
