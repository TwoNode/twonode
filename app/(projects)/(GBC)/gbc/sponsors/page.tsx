// src/app/(public)/sponsors/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ExternalLink, Mail, ArrowRight } from "lucide-react";
import { getPartners, getSponsors } from "@/gbc/services/cmsService";
import GBC2Navbar from "@/gbc/components/Navbar";

export default async function SponsorsPage() {
  const [sponsors, partners] = await Promise.all([getSponsors(), getPartners()]);

  // Group sponsors by tier
  const sponsorsByTier = {
    HEADLINE: sponsors?.filter((s) => s.tier === "HEADLINE") || [],
    IMPACT: sponsors?.filter((s) => s.tier === "IMPACT") || [],
    SUPPORTING: sponsors?.filter((s) => s.tier === "SUPPORTING") || [],
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <GBC2Navbar />

      {/* Hero Section */}
      <section className="relative py-16 sm:py-20 md:py-24 bg-linear-to-br from-purple-600 via-indigo-600 to-blue-600 text-white">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
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
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700">
                <Mail className="mr-2 h-4 w-4" />
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Headline Sponsors */}
      {sponsorsByTier.HEADLINE.length > 0 && (
        <section className="py-12 sm:py-16 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10 sm:mb-12">
              <div className="inline-block px-6 py-2 bg-purple-100 text-purple-600 rounded-full font-bold mb-4">
                HEADLINE SPONSORS
              </div>
              <p className="text-gray-600">Our premier partners</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
              {sponsorsByTier.HEADLINE.map((sponsor: any) => (
                <SponsorCard key={sponsor.id} sponsor={sponsor} featured />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Impact Sponsors */}
      {sponsorsByTier.IMPACT.length > 0 && (
        <section className="py-12 sm:py-16 bg-gray-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10 sm:mb-12">
              <div className="inline-block px-6 py-2 bg-yellow-100 text-yellow-600 rounded-full font-bold mb-4">
                IMPACT SPONSORS
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
              {sponsorsByTier.IMPACT.map((sponsor: any) => (
                <SponsorCard key={sponsor.id} sponsor={sponsor} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Supporting Sponsors */}
      {sponsorsByTier.SUPPORTING.length > 0 && (
        <section className="py-12 sm:py-16 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10 sm:mb-12">
              <div className="inline-block px-6 py-2 bg-gray-200 text-gray-700 rounded-full font-bold mb-4">
                SUPPORTING SPONSORS
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 max-w-6xl mx-auto">
              {sponsorsByTier.SUPPORTING.map((sponsor: any) => (
                <SponsorCard key={sponsor.id} sponsor={sponsor} compact />
              ))}
            </div>
          </div>
        </section>
      )}

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
      <section className="py-16 sm:py-20 md:py-24 bg-linear-to-br from-purple-600 to-indigo-600 text-white">
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
                  className="bg-white text-purple-600 hover:bg-gray-100"
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
      className={`bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow ${
        featured ? "border-2 border-purple-200" : ""
      }`}
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
              className="inline-flex items-center text-purple-600 hover:text-purple-700 font-medium"
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
