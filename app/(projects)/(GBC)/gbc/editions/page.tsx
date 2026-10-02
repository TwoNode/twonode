import Link from "next/link";
import { Calendar, MapPin, ArrowRight } from "lucide-react";
import { getEditions } from "@/gbc/services/editionService";
import GBC2Navbar from "@/gbc/components/Navbar";
import { GBC_COLORS, GBC_GRADIENTS } from "@/gbc/colors";

export const metadata = {
  title: "Past Editions - GBC",
};

export const dynamic = "force-dynamic";

export default async function PastEditionsPage() {
  const editions = await getEditions();
  const past = editions
    .filter((e) => e.status === "PAST")
    .sort((a, b) => b.key.localeCompare(a.key, undefined, { numeric: true }));

  return (
    <div className="min-h-screen bg-gray-50">
      <GBC2Navbar />

      <section
        className="relative py-16 sm:py-20 md:py-24 text-white"
        style={{ background: GBC_GRADIENTS.hero }}
      >
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10">
          <Link
            href="/gbc"
            className="flex items-center text-white/80 hover:text-white transition-colors text-sm sm:text-base"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4 sm:w-5 sm:h-5 mr-1"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            Back to Home
          </Link>
        </div>
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6">
              Past Editions
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-100 px-2">
              A look back at every Geospatial Builders Conference so far
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {past.length === 0 ? (
            <p className="text-center text-gray-500 max-w-xl mx-auto">
              No past editions yet — check back after this year&apos;s
              conference wraps up.
            </p>
          ) : (
            <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
              {past.map((edition) => (
                <Link
                  key={edition.key}
                  href={`/gbc/editions/${edition.key}`}
                  className="group block bg-white rounded-xl shadow-lg hover:shadow-2xl transition-shadow overflow-hidden"
                >
                  <div className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                    <div className="flex-1">
                      <div
                        className="text-sm font-semibold mb-1"
                        style={{ color: GBC_COLORS.primary.main }}
                      >
                        GBC {edition.key}
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold mb-2">
                        {edition.name}
                      </h2>
                      <p className="text-gray-600 mb-3">{edition.theme}</p>
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          {new Date(edition.startDate).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          )}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-4 w-4" />
                          {edition.venue}
                        </span>
                      </div>
                    </div>
                    <ArrowRight
                      className="h-6 w-6 shrink-0 group-hover:translate-x-1 transition-transform"
                      style={{ color: GBC_COLORS.primary.main }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
