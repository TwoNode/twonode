import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Calendar,
  MapPin,
  Users,
  TrendingUp,
  Building2,
  Zap,
  AlertCircle,
} from "lucide-react";
import { getGBCTicketStats } from "../actions/ticket-actions";
import { getSponsors } from "../actions/sponsor-actions";
import { getAllGBCSettings } from "../actions/settings-actions";

// Import new components
import HomeSpeakers from "@/app/(projects)/(GBC)/components/HomeSpeakers";
import HomeSponsors from "@/app/(projects)/(GBC)/components/HomeSponsors";
import HomeGallery from "@/app/(projects)/(GBC)/components/HomeGallery";
import GBC2Navbar from "../components/Navbar";

export default async function HomePage() {
  const statsResult = await getGBCTicketStats();
  const sponsorsResult = await getSponsors();
  const settingsResult = await getAllGBCSettings();

  const stats = statsResult.success ? statsResult.data : null;
  const sponsors = sponsorsResult.success
    ? sponsorsResult.data?.slice(0, 6)
    : [];
  const settings = settingsResult.success ? settingsResult.data : null;

  // Get settings with fallbacks
  const eventName =
    settings?.event.name ?? "Geospatial Builders Conference 2.0";
  const eventTheme =
    settings?.event.theme ??
    "Geospatial Capital: A Catalyst for Inclusive Growth";
  const eventSubTheme =
    settings?.event.subTheme ??
    "Driving Transformation in Land Administration and Energy";
  const eventDate = settings?.event.date ?? "2025-05-15";
  const eventVenue = settings?.event.venue ?? "Lagos, Nigeria";
  const earlyBirdPrice = settings?.tickets.earlyBirdPrice ?? 100000;
  const regularPrice = settings?.tickets.regularPrice ?? 120000;
  const companyPrice = settings?.tickets.companyPrice ?? 150000;
  const importantNotices = settings?.event.importantNotices ?? [];

  const earlyBirdInfoList = settings?.tickets.earlyBirdInfoList ?? [
    "Full conference access",
    "All keynote sessions",
    "Networking opportunities",
    "Lunch & refreshments",
    "Conference materials",
  ];
  const regularInfoList = settings?.tickets.regularInfoList ?? [
    "Full conference access",
    "All keynote sessions",
    "Networking opportunities",
    "Lunch & refreshments",
    "Conference materials",
  ];
  const companyInfoList = settings?.tickets.companyInfoList ?? [
    "Tickets for 5 attendees",
    "Full conference access",
    "Premium seating",
    "Company mention",
    "Dedicated networking",
  ];

  // Format date for display
  const formattedDate = new Date(eventDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <GBC2Navbar />

      {/* Hero Section */}
      <section className="relative min-h-[60vh] sm:min-h-[70vh] pt-6 flex items-center justify-center overflow-hidden bg-linear-to-br from-purple-600 via-indigo-600 to-blue-600">
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div
          className="absolute inset-0 bg-cover bg-center opacity-50"
          style={{
            backgroundImage: "url('/gbc/gbcBg.webp')",
            mixBlendMode: "overlay",
          }}
        />

        <div className="relative z-10 container flex flex-col items-center justify-center mx-auto px-4 pb-16 sm:px-6 lg:px-8 text-center text-white">
          <div className="animate-fade-in">
            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-7xl font-bold mb-4 sm:mb-6 leading-tight">
              {eventName}
            </h1>

            <p className="text-base sm:text-xl md:text-2xl lg:text-3xl mb-3 sm:mb-4 font-semibold px-2">
              {eventTheme}
            </p>

            <p className="text-sm sm:text-lg md:text-xl lg:text-2xl mb-6 sm:mb-8 text-gray-200 px-2">
              {eventSubTheme}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <div className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5" />
                <span>{formattedDate}</span>
              </div>
              <div className="hidden sm:block text-gray-300">|</div>
              <div className="flex items-center gap-2 text-lg">
                <MapPin className="h-5 w-5" />
                <span>{eventVenue}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/gbc/tickets">
                <Button
                  size="lg"
                  className="text-lg px-8 py-4 bg-white text-purple-600 hover:bg-gray-100 btn-glow"
                >
                  Buy Tickets Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/gbc/about">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-8 py-6 bg-white/10 text-white border-white hover:bg-white/20"
                >
                  Learn More
                </Button>
              </Link>
            </div>

            {stats && stats.availableTickets > 0 && (
              <p className="mt-8 text-lg text-yellow-300 animate-pulse">
                ⚡ Only {stats.availableTickets} tickets remaining!
              </p>
            )}
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-4 h-6 border-2 border-white rounded-full flex items-start justify-center p-1">
            <div className="w-1 h-2 bg-white rounded-full" />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      {stats && (
        <section className="py-12 sm:py-16 bg-gray-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
              <div className="text-center">
                <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-purple-600 mb-1 sm:mb-2">
                  {stats.completedTickets}
                </div>
                <div className="text-sm sm:text-base text-gray-600">
                  Tickets Sold
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-purple-600 mb-1 sm:mb-2">
                  {stats.maxTickets}
                </div>
                <div className="text-sm sm:text-base text-gray-600">
                  Total Capacity
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-purple-600 mb-1 sm:mb-2">
                  50+
                </div>
                <div className="text-sm sm:text-base text-gray-600">
                  Speakers
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-purple-600 mb-1 sm:mb-2">
                  100+
                </div>
                <div className="text-sm sm:text-base text-gray-600">
                  Companies
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* What is GBC Section */}
      <section className="py-16 sm:py-20 md:py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6">
              What is GBC?
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 leading-relaxed px-2">
              The Geospatial Builders Conference (GBC) is Nigeria's premier
              annual platform dedicated to unlocking the power of geospatial
              technology as capital. It is not just a gathering of geospatial
              professionals—it is a cross-industry hub where innovators,
              decision makers, and investors come together.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
            <div className="text-center p-8 rounded-lg hover:shadow-xl transition-shadow bg-linear-to-br from-purple-50 to-indigo-50">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Connect</h3>
              <p className="text-gray-600">
                Network with innovators, decision makers, and investors from
                across industries
              </p>
            </div>

            <div className="text-center p-8 rounded-lg hover:shadow-xl transition-shadow bg-linear-to-br from-blue-50 to-indigo-50">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Showcase</h3>
              <p className="text-gray-600">
                Discover groundbreaking projects and practical applications of
                geospatial tech
              </p>
            </div>

            <div className="text-center p-8 rounded-lg hover:shadow-xl transition-shadow bg-linear-to-br from-indigo-50 to-purple-50">
              <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Transform</h3>
              <p className="text-gray-600">
                Drive transformation in land administration, energy, and
                sustainable growth
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Industries Section */}
      <section className="py-16 sm:py-20 md:py-24 bg-gray-900 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6">
              Industries We Serve
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-3xl mx-auto px-2">
              GBC showcases the economic, social, and governance value that
              geospatial technology brings to various sectors
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 max-w-5xl mx-auto">
            {[
              "Energy & Oil/Gas",
              "Real Estate & Infrastructure",
              "Transportation",
              "Telecommunication",
              "Agriculture & Food Security",
              "Health & Fitness",
              "Finance & Insurance",
              "Governance & Urban Development",
            ].map((industry, index) => (
              <div
                key={index}
                className="p-4 sm:p-6 bg-white/10 rounded-lg backdrop-blur-sm hover:bg-white/20 transition-all cursor-pointer"
              >
                <Building2 className="h-6 w-6 sm:h-8 sm:w-8 mb-2 sm:mb-3 text-purple-400" />
                <h3 className="font-semibold text-sm sm:text-base">
                  {industry}
                </h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Important Notices */}
      {importantNotices.length > 0 && (
        <section className="py-8 sm:py-12 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <div className="relative overflow-hidden rounded-2xl bg-amber-50 border border-amber-100 shadow-lg">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-linear-to-b from-amber-400 to-orange-500" />
                <div className="p-6 sm:p-8">
                  <div className="flex items-start gap-4 sm:gap-6">
                    <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 shadow-sm">
                      <AlertCircle className="h-6 w-6" />
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="sm:hidden flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 shadow-sm">
                          <AlertCircle className="h-4 w-4" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                          Important Updates
                        </h3>
                      </div>
                      <div className="space-y-3">
                        {importantNotices.map(
                          (notice: string, index: number) => (
                            <div
                              key={index}
                              className="flex gap-3 text-gray-700"
                            >
                              <span className="text-amber-500 font-bold mt-0.5">
                                •
                              </span>
                              <p className="text-base sm:text-lg leading-relaxed">
                                {notice}
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Speakers Section */}
      <HomeSpeakers />

      {/* Sponsors Section */}
      <HomeSponsors />

      {/* Gallery Section */}
      <HomeGallery />

      {/* CTA Section */}
      <section className="py-16 sm:py-20 md:py-24 bg-linear-to-r from-purple-600 to-indigo-600 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6">
            Ready to Join GBC 2.0?
          </h2>
          <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
            Don't miss this opportunity to be part of Nigeria's premier
            geospatial technology conference
          </p>

          {stats && stats.availableTickets > 0 ? (
            <>
              <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12 text-left">
                {/* Early Bird Card */}
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:transform hover:scale-105 transition-all duration-300 flex flex-col">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-white">Early Bird</h3>
                    <div className="text-3xl font-bold text-yellow-300 mt-2">
                      ₦{(earlyBirdPrice / 1000).toFixed(0)}K
                    </div>
                    <p className="text-sm text-gray-300 mt-1">
                      Limited to {settings?.tickets.maxEarlyBirdCapacity ?? 500}{" "}
                      seats
                    </p>
                  </div>
                  <ul className="space-y-2 mb-6 grow">
                    {earlyBirdInfoList.map((item: string, i: number) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-gray-200"
                      >
                        <span className="text-green-400 mt-0.5">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Regular Card */}
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:transform hover:scale-105 transition-all duration-300 relative overflow-hidden flex flex-col">
                  <div className="absolute top-0 right-0 bg-purple-500 text-xs font-bold px-3 py-1 rounded-bl-lg">
                    POPULAR
                  </div>
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-white">Regular</h3>
                    <div className="text-3xl font-bold text-white mt-2">
                      ₦{(regularPrice / 1000).toFixed(0)}K
                    </div>
                    <p className="text-sm text-gray-300 mt-1">
                      Standard access
                    </p>
                  </div>
                  <ul className="space-y-2 mb-6 grow">
                    {regularInfoList.map((item: string, i: number) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-gray-200"
                      >
                        <span className="text-green-400 mt-0.5">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Company Card */}
                <div className="bg-linear-to-br from-amber-500/20 to-purple-600/20 backdrop-blur-sm border border-amber-500/30 rounded-2xl p-6 hover:transform hover:scale-105 transition-all duration-300 flex flex-col">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-white">Company</h3>
                    <div className="text-3xl font-bold text-amber-300 mt-2">
                      ₦{(companyPrice / 1000).toFixed(0)}K
                    </div>
                    <p className="text-sm text-gray-300 mt-1">Group of 5</p>
                  </div>
                  <ul className="space-y-2 mb-6 grow">
                    {companyInfoList.map((item: string, i: number) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-gray-200"
                      >
                        <span className="text-green-400 mt-0.5">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <Link href="/gbc/tickets">
                <Button
                  size="lg"
                  className="text-lg px-8 py-6 bg-white text-purple-600 hover:bg-gray-100 shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1"
                >
                  Get Your Ticket Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <p className="mt-4 text-yellow-300 font-medium animate-pulse">
                Only {stats.availableTickets} tickets left!
              </p>
            </>
          ) : (
            <p className="text-2xl font-bold text-yellow-300">
              Sold Out! Stay tuned for next year's edition.
            </p>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-10 sm:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">GBC 2.0</h3>
              <p className="text-gray-400">
                Nigeria's premier geospatial technology conference
              </p>
            </div>

            <div>
              <h4 className="font-bold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="/gbc/about" className="hover:text-white">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/gbc/tickets" className="hover:text-white">
                    Tickets
                  </Link>
                </li>
                <li>
                  <Link href="/gbc/sponsors" className="hover:text-white">
                    Sponsors
                  </Link>
                </li>
                <li>
                  <Link href="/gbc/gallery" className="hover:text-white">
                    Gallery
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">Contact</h4>
              <ul className="space-y-2 text-gray-400">
                <li>+234-916-0002-740</li>
                <li>info@twonodetechnologies.com</li>
                <li>
                  <Link href="/gbc/contact" className="hover:text-white">
                    Contact Form
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">Follow Us</h4>
              <div className="flex gap-4">
                <a href="#" className="text-gray-400 hover:text-white">
                  #GBC2.0
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p> 2025 Two Node Technologies. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
