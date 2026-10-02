import { getSpeakers } from "@/gbc/services/cmsService";
import GBC2Navbar from "@/gbc/components/Navbar";
import { Speaker } from "@/gbc/types/speaker";
import { Card } from "@/components/ui/card";
import { Linkedin, Twitter, Building2 } from "lucide-react";
import { GBC_COLORS, GBC_GRADIENTS } from "@/gbc/colors";

export const metadata = {
  title: "Speakers | GBC 2.0",
  description: "Meet our distinguished speakers at GBC 2.0",
};

export const dynamic = "force-dynamic";

export default async function SpeakersPage() {
  const allSpeakers = await getSpeakers();

  // Group speakers by tier
  const keynoteSpeakers = allSpeakers.filter((s) => s.tier === "KEYNOTE");
  const panelists = allSpeakers.filter((s) => s.tier === "PANELIST");
  const firesideSpeakers = allSpeakers.filter(
    (s) => s.tier === "FIRESIDE_CHAT"
  );

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-white">
      <GBC2Navbar />

      {/* Hero Section */}
      <section
        className="text-white py-20"
        style={{ background: GBC_GRADIENTS.primary }}
      >
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Meet Our Speakers
            </h1>
            <p className="text-xl md:text-2xl text-purple-100">
              Industry leaders and innovators sharing their insights at GBC 2.0
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-16">
        {/* Keynote Speakers */}
        {keynoteSpeakers.length > 0 && (
          <section className="mb-20">
            <div className="text-center mb-12">
              <div
                className="inline-flex items-center gap-3 px-6 py-3 rounded-full mb-4"
                style={{ background: GBC_COLORS.surface.main }}
              >
                <span className="text-3xl">🎤</span>
                <h2 className="text-3xl font-bold text-gray-900">
                  Keynote Speakers
                </h2>
              </div>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Distinguished thought leaders delivering inspirational keynote
                addresses
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {keynoteSpeakers.map((speaker) => (
                <SpeakerCard key={speaker.id} speaker={speaker} featured />
              ))}
            </div>
          </section>
        )}

        {/* Panelists */}
        {panelists.length > 0 && (
          <section className="mb-20">
            <div className="text-center mb-12">
              <div
                className="inline-flex items-center gap-3 px-6 py-3 rounded-full mb-4"
                style={{ background: "#FCE7F3" }}
              >
                <span className="text-3xl">💬</span>
                <h2 className="text-3xl font-bold text-gray-900">Panelists</h2>
              </div>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Expert panelists engaging in dynamic discussions
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {panelists.map((speaker) => (
                <SpeakerCard key={speaker.id} speaker={speaker} />
              ))}
            </div>
          </section>
        )}

        {/* Fireside Chat */}
        {firesideSpeakers.length > 0 && (
          <section className="mb-20">
            <div className="text-center mb-12">
              <div
                className="inline-flex items-center gap-3 px-6 py-3 rounded-full mb-4"
                style={{ background: GBC_COLORS.surface.main }}
              >
                <span className="text-3xl">🔥</span>
                <h2 className="text-3xl font-bold text-gray-900">
                  Fireside Chat
                </h2>
              </div>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Intimate conversations with industry pioneers
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {firesideSpeakers.map((speaker) => (
                <SpeakerCard key={speaker.id} speaker={speaker} featured />
              ))}
            </div>
          </section>
        )}

        {allSpeakers.length === 0 && (
          <div className="text-center py-20">
            <p className="text-2xl text-gray-500">
              Speaker lineup coming soon...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function SpeakerCard({
  speaker,
  featured = false,
}: {
  speaker: Speaker;
  featured?: boolean;
}) {
  return (
    <Card
      className={`overflow-hidden group hover:shadow-2xl transition-all duration-300 ${
        featured ? "md:col-span-1" : ""
      }`}
    >
      <div className="relative overflow-hidden bg-linear-to-br from-gray-100 to-gray-200">
        <img
          src={speaker.photo}
          alt={speaker.name}
          className={`w-full object-cover group-hover:scale-105 transition-transform duration-500 ${
            featured ? "h-80" : "h-64"
          }`}
        />
        {speaker.featured && (
          <div
            className="absolute top-4 right-4 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg"
            style={{ background: GBC_GRADIENTS.primary }}
          >
            ⭐ Featured
          </div>
        )}
      </div>

      <div className="p-6">
        <h3
          className={`font-bold text-gray-900 mb-2 ${
            featured ? "text-2xl" : "text-xl"
          }`}
        >
          {speaker.name}
        </h3>

        <p
          className="font-semibold mb-2"
          style={{ color: GBC_COLORS.primary.main }}
        >
          {speaker.title}
        </p>

        {speaker.company && (
          <div className="flex items-center gap-2 text-gray-600 mb-4">
            <Building2 className="h-4 w-4" />
            <span className="text-sm">{speaker.company}</span>
          </div>
        )}

        <p
          className={`text-gray-600 mb-4 ${
            featured ? "line-clamp-4" : "line-clamp-3"
          }`}
        >
          {speaker.bio}
        </p>

        {/* Social Links */}
        {(speaker.linkedin || speaker.twitter) && (
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            {speaker.linkedin && (
              <a
                href={speaker.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors"
              >
                <Linkedin className="h-5 w-5" />
                <span className="text-sm font-medium">LinkedIn</span>
              </a>
            )}
            {speaker.twitter && (
              <a
                href={speaker.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sky-600 hover:text-sky-700 transition-colors"
              >
                <Twitter className="h-5 w-5" />
                <span className="text-sm font-medium">X/Twitter</span>
              </a>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
