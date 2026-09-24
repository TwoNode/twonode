// src/app/(public)/sponsors/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ExternalLink, Mail, ArrowRight } from "lucide-react";
import { getPartners, getSponsors } from "@/gbc/services/cmsService";
import { getSponsorTiers } from "@/gbc/services/sponsorTierService";
import { groupSponsorsByTier } from "@/gbc/utils/sponsorTiers";
import GBC2Navbar from "@/gbc/components/Navbar";
import { GBC_COLORS, GBC_GRADIENTS } from "@/gbc/colors";

// Sponsors and their tiers are edited in the admin; render per request so a change shows up straight away
// (a statically prerendered copy would stay frozen at whatever the database held at build time).
export const dynamic = "force-dynamic";

export default async function SponsorsPage() {
  const [sponsors, partners, tiers] = await Promise.all([
    getSponsors(),
    getPartners(),
    getSponsorTiers(),
  ]);

  // One section per tier that has sponsors, in the order set in the admin.
  const tierGroups = groupSponsorsByTier(tiers, sponsors ?? []);

  return (
    <div className="min-h-screen bg-gray-50">
      <GBC2Navbar />

      {/* Hero Section */}
      <section
        className="relative py-16 sm:py-20 md:py-24 text-white"
        style={{ background: GBC_GRADIENTS.hero }}
      >
        <div className="absolute inset-0 opacity-10" />
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
              Our Sponsors & Partners
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-100 px-2">
              Thank you to our amazing sponsors and partners who make GBC 2.0
              possible
            </p>
          </div>
        </div>
      </section>

      {/* Become a Sponsor CTA */}
      <section className="py-10 sm:py-12 bg-white border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
            <div className="text-center md:text-left">
              <h2 className="text-xl sm:text-2xl font-bold mb-2">
                Interested in Sponsoring?
              </h2>
              <p className="text-gray-600">
                Partner with us to reach Nigeria's geospatial technology
                community
              </p>
            </div>
            <Link href="/gbc/contact">
              <Button
                size="lg"
                className="hover:brightness-110"
                style={{ background: GBC_COLORS.primary.main }}
              >
                <Mail className="mr-2 h-4 w-4" />
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Sponsors, one section per tier. Card size and badge style follow the
          tier's size: FEATURED (large), STANDARD, COMPACT (small logos). */}
      {tierGroups.map(({ tier, sponsors: tierSponsors }, index) => {
        const featured = tier.size === "FEATURED";
        const compact = tier.size === "COMPACT";
        return (
          <section
            key={tier.key}
            className={`py-12 sm:py-16 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
          >
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-10 sm:mb-12">
                <div
                  className={`inline-block px-6 py-2 rounded-full font-bold mb-4 ${
                    compact ? "bg-gray-200 text-gray-700" : ""
                  }`}
                  style={
                    featured
                      ? { background: GBC_COLORS.surface.main, color: GBC_COLORS.primary.main }
                      : compact
                        ? undefined
                        : { background: "#FCE7F3", color: GBC_COLORS.secondary.dark }
                  }
                >
                  {tier.name.toUpperCase()}
                </div>
                {tier.description && <p className="text-gray-600">{tier.description}</p>}
              </div>

              <div
                className={
                  featured
                    ? "grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto"
                    : compact
                      ? "grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 max-w-6xl mx-auto"
                      : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto"
                }
              >
                {tierSponsors.map((sponsor: any) => (
                  <SponsorCard key={sponsor.id} sponsor={sponsor} featured={featured} compact={compact} />
                ))}
              </div>
            </div>
          </section>
        );
      })}

      {/* Partners */}
      {partners && partners.length > 0 && (
        <section className="py-12 sm:py-16 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">
                Our Partners
              </h2>
              <p className="text-gray-600">
                Collaborating organizations supporting GBC 2.0
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 max-w-6xl mx-auto">
              {partners.map((partner: any) => (
                <div
                  key={partner.id}
                  className="bg-gray-50 rounded-lg p-6 flex items-center justify-center hover:shadow-lg transition-shadow"
                >
                  <img
                    src={partner.logo}
                    alt={partner.name}
                    className="max-h-16 w-auto object-contain"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Sponsorship Benefits */}
      <section
        className="py-16 sm:py-20 md:py-24 text-white"
        style={{ background: GBC_GRADIENTS.primary }}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 sm:mb-6">
              Why Sponsor GBC 2.0?
            </h2>
            <p className="text-base sm:text-lg md:text-xl mb-10 sm:mb-12 px-2">
              Connect with Nigeria's leading geospatial technology professionals
              and decision-makers
            </p>

            <div className="grid md:grid-cols-3 gap-8 text-left">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                <div className="text-3xl mb-3">🎯</div>
                <h3 className="text-xl font-bold mb-2">Brand Visibility</h3>
                <p className="text-gray-100">
                  Showcase your brand to 150+ attendees and thousands online
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                <div className="text-3xl mb-3">🤝</div>
                <h3 className="text-xl font-bold mb-2">Networking</h3>
                <p className="text-gray-100">
                  Connect with industry leaders, innovators, and investors
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                <div className="text-3xl mb-3">💡</div>
                <h3 className="text-xl font-bold mb-2">Thought Leadership</h3>
                <p className="text-gray-100">
                  Position your organization as a leader in geospatial
                  innovation
                </p>
              </div>
            </div>

            <div className="mt-12">
              <Link href="/gbc/contact">
                <Button
                  size="lg"
                  className="bg-white hover:bg-gray-100"
                  style={{ color: GBC_COLORS.primary.main }}
                >
                  Become a Sponsor
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function SponsorCard({
  sponsor,
  featured = false,
  compact = false,
}: {
  sponsor: any;
  featured?: boolean;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="bg-white rounded-lg p-6 flex items-center justify-center hover:shadow-lg transition-shadow">
        <img
          src={sponsor.logo}
          alt={sponsor.name}
          className="max-h-20 w-auto object-contain"
        />
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow"
      style={
        featured
          ? { border: `2px solid ${GBC_COLORS.primary.light}` }
          : undefined
      }
    >
      <div className="p-8">
        <div className="flex items-center justify-center mb-6 h-32">
          <img
            src={sponsor.logo}
            alt={sponsor.name}
            className="max-h-full max-w-full object-contain"
          />
        </div>

        <h3 className="text-2xl font-bold text-center mb-3">{sponsor.name}</h3>

        {sponsor.description && (
          <p className="text-gray-600 text-center mb-4 line-clamp-3">
            {sponsor.description}
          </p>
        )}

        {sponsor.website && (
          <div className="text-center">
            <a
              href={sponsor.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center hover:opacity-80 font-medium"
              style={{ color: GBC_COLORS.primary.main }}
            >
              Visit Website
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
