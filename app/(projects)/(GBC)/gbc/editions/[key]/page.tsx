import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, MapPin, Users, Mic, Award } from "lucide-react";
import { getEditionPublicRecap } from "@/gbc/services/editionService";
import GBC2Navbar from "@/gbc/components/Navbar";
import { GBC_GRADIENTS } from "@/gbc/colors";

type PageProps = { params: Promise<{ key: string }> };

export default async function EditionRecapPage({ params }: PageProps) {
  const { key } = await params;

  let recap;
  try {
    recap = await getEditionPublicRecap(key);
  } catch {
    notFound();
  }

  const { edition, attendeeCount, sponsors, speakers } = recap;

  return (
    <div className="min-h-screen bg-gray-50">
      <GBC2Navbar />

      <section className="relative py-16 sm:py-20 md:py-24 text-white" style={{ background: GBC_GRADIENTS.hero }}>
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10">
          <Link
            href="/gbc/editions"
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
            Past Editions
          </Link>
        </div>
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="text-sm font-semibold text-purple-200 mb-2">GBC {edition.key}</div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">{edition.name}</h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-100 px-2 mb-6">{edition.theme}</p>
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm sm:text-base text-purple-100">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {new Date(edition.startDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {edition.venue}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="py-10 sm:py-12 bg-white border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto grid grid-cols-3 gap-4 sm:gap-8 text-center">
            <div>
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl sm:text-3xl font-bold">{attendeeCount}</div>
              <div className="text-sm text-gray-500">Attendees</div>
            </div>
            <div>
              <Award className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl sm:text-3xl font-bold">{sponsors.length}</div>
              <div className="text-sm text-gray-500">Sponsors</div>
            </div>
            <div>
              <Mic className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl sm:text-3xl font-bold">{speakers.length}</div>
              <div className="text-sm text-gray-500">Speakers</div>
            </div>
          </div>
        </div>
      </section>

      {speakers.length > 0 && (
        <section className="py-12 sm:py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-10">Speakers</h2>
            <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
              {speakers.map((speaker) => (
                <div key={speaker.id} className="text-center">
                  <img
                    src={speaker.photo}
                    alt={speaker.name}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover mx-auto mb-3"
                  />
                  <div className="font-semibold text-sm sm:text-base">{speaker.name}</div>
                  <div className="text-xs sm:text-sm text-gray-500">{speaker.title}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {sponsors.length > 0 && (
        <section className="py-12 sm:py-16 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-10">Sponsors</h2>
            <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-8 sm:gap-12">
              {sponsors.map((sponsor) => (
                <img
                  key={sponsor.id}
                  src={sponsor.logo}
                  alt={sponsor.name}
                  className="h-12 sm:h-16 object-contain"
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
