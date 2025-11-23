import { Check, AlertCircle } from "lucide-react";
import { getGBCTicketStats } from "../../actions/ticket-actions";
import { GBCTicketPurchaseForm } from "../../components/TicketPurchaseForm";
import Link from "next/link";

export default async function TicketsPage() {
  const statsResult = await getGBCTicketStats();
  const stats = statsResult.success ? statsResult.data : null;

  const isSoldOut = stats ? stats.availableTickets <= 0 : false;
  const totalTickets = stats ? stats.maxTickets : 0;

  const earlyBirdPrice = parseInt(
    process.env.NEXT_PUBLIC_EARLY_BIRD_PRICE || "100000"
  );
  const regularPrice = parseInt(
    process.env.NEXT_PUBLIC_REGULAR_PRICE || "120000"
  );
  const companyPrice = parseInt(
    process.env.NEXT_PUBLIC_COMPANY_PRICE || "250000"
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative py-16 sm:py-20 md:py-24 bg-linear-to-br from-purple-600 via-indigo-600 to-blue-600 text-white">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10">
          <Link
            href="/gbc2"
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
              Get Your Ticket
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-100 mb-6 sm:mb-8 px-2">
              Join us at GBC 2.0 - Geospatial Capital: A Catalyst for Inclusive
              Growth
            </p>

            {stats && !isSoldOut && (
              <div className="inline-block bg-white/20 backdrop-blur-sm px-4 sm:px-6 py-2 sm:py-3 rounded-full">
                <p className="text-sm sm:text-base md:text-lg">
                  <span className="font-bold text-yellow-300">
                    {stats.availableTickets}
                  </span>{" "}
                  tickets remaining
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {isSoldOut ? (
        // Sold Out Message
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="h-12 w-12 text-red-600" />
              </div>
              <h2 className="text-4xl font-bold mb-4">Tickets Sold Out!</h2>
              <p className="text-xl text-gray-600 mb-8">
                We're sorry, all tickets for GBC 2.0 have been sold. Stay tuned
                for next year's edition!
              </p>
              <p className="text-gray-500">
                Follow us on social media to be notified when tickets for GBC
                2026 go on sale.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <>
          {/* Ticket Options */}
          <section className="py-12 sm:py-16 bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-5xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-16">
                  {/* Early Bird Ticket */}
                  <div className="bg-linear-to-br from-purple-50 to-indigo-50 rounded-2xl p-4 sm:p-6 border-2 border-purple-200 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-purple-600 text-white px-2 sm:px-3 py-1 text-xs font-bold">
                      POPULAR
                    </div>

                    <div className="text-center mb-3 sm:mb-4">
                      <h3 className="text-xl sm:text-2xl font-bold mb-2">
                        Early Bird
                      </h3>
                      <div className="text-3xl sm:text-4xl font-bold text-purple-600 mb-2">
                        ₦{(earlyBirdPrice / 1000).toFixed(0)}K
                      </div>
                      <p className="text-sm text-gray-600">
                        Limited availability
                      </p>
                    </div>

                    <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                      {[
                        "Full conference access",
                        "All keynote sessions",
                        "Networking opportunities",
                        "Lunch & refreshments",
                        "Conference materials",
                        "Certificate of attendance",
                        "Access to exhibition area",
                      ].map((feature, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-1.5 sm:gap-2"
                        >
                          <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 shrink-0 mt-0.5" />
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Regular Ticket */}
                  <div className="bg-linear-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 sm:p-6 border-2 border-blue-200">
                    <div className="text-center mb-3 sm:mb-4">
                      <h3 className="text-xl sm:text-2xl font-bold mb-2">
                        Regular
                      </h3>
                      <div className="text-3xl sm:text-4xl font-bold text-blue-600 mb-2">
                        ₦{(regularPrice / 1000).toFixed(0)}K
                      </div>
                      <p className="text-sm text-gray-600">Standard pricing</p>
                    </div>

                    <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                      {[
                        "Full conference access",
                        "All keynote sessions",
                        "Networking opportunities",
                        "Lunch & refreshments",
                        "Conference materials",
                        "Certificate of attendance",
                        "Access to exhibition area",
                      ].map((feature, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-1.5 sm:gap-2"
                        >
                          <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 shrink-0 mt-0.5" />
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Company Ticket */}
                  <div className="bg-linear-to-br from-amber-50 to-orange-50 rounded-2xl p-4 sm:p-6 border-2 border-amber-200 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-amber-600 text-white px-2 sm:px-3 py-1 text-xs font-bold">
                      PREMIUM
                    </div>

                    <div className="text-center mb-3 sm:mb-4">
                      <h3 className="text-xl sm:text-2xl font-bold mb-2">
                        Company
                      </h3>
                      <div className="text-3xl sm:text-4xl font-bold text-amber-600 mb-2">
                        ₦{(companyPrice / 1000).toFixed(0)}K
                      </div>
                      <p className="text-sm text-gray-600">Corporate package</p>
                    </div>

                    <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                      {[
                        "All Regular benefits, plus:",
                        "3 conference passes",
                        "Premium seating at keynotes",
                        "Company logo on event website",
                        "Mention in event materials",
                        "Dedicated networking area",
                        "VIP access to all sessions",
                      ].map((feature, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-1.5 sm:gap-2"
                        >
                          <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 shrink-0 mt-0.5" />
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Registration Form */}
          <section className="py-12 sm:py-16 bg-gray-50">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-3xl mx-auto">
                <div className="text-center mb-6 sm:mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">
                    Registration Details
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600 px-2">
                    Fill in your information to complete your ticket purchase
                  </p>
                </div>

                {/* <TicketPurchaseForm />

                <hr />
                <hr /> */}

                <GBCTicketPurchaseForm />
              </div>
            </div>
          </section>

          {/* Important Information */}
          <section className="py-12 sm:py-16 bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-4xl mx-auto">
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 sm:p-6 rounded-r-lg">
                  <h3 className="font-bold text-yellow-800 mb-2 sm:mb-3 text-base sm:text-lg">
                    ⚠️ Important Information
                  </h3>
                  <ul className="space-y-1.5 sm:space-y-2 text-sm sm:text-base text-yellow-700">
                    <li>• Tickets are non-refundable</li>
                    <li>• Maximum capacity: {totalTickets} attendees</li>
                    <li>
                      • You will receive a QR code ticket via email after
                      payment
                    </li>
                    <li>• Present your QR code at the entrance for check-in</li>
                    <li>• Valid government-issued ID required at the event</li>
                    <li>• Payment is securely processed via Paystack</li>
                  </ul>
                </div>

                <div className="mt-6 sm:mt-8 bg-purple-50 border-l-4 border-purple-600 p-4 sm:p-6 rounded-r-lg">
                  <h3 className="font-bold text-purple-900 mb-2 sm:mb-3 text-base sm:text-lg">
                    📍 Event Details
                  </h3>
                  <ul className="space-y-1.5 sm:space-y-2 text-sm sm:text-base text-purple-800">
                    <li>
                      <strong>Date:</strong>{" "}
                      {process.env.NEXT_PUBLIC_EVENT_DATE || "May 15, 2025"}
                    </li>
                    <li>
                      <strong>Location:</strong>{" "}
                      {process.env.NEXT_PUBLIC_EVENT_LOCATION ||
                        "Lagos, Nigeria"}
                    </li>
                    <li>
                      <strong>Venue:</strong>{" "}
                      {process.env.NEXT_PUBLIC_EVENT_VENUE ||
                        "Conference Center, Lagos"}
                    </li>
                    <li>
                      <strong>Time:</strong> 9:00 AM - 5:00 PM
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
