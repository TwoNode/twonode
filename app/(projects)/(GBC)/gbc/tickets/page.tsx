import { AlertCircle } from "lucide-react";
import { getTicketAvailability } from "@/gbc/services/ticketService";
import { GBCTicketPurchaseForm } from "@/gbc/components/TicketPurchaseForm";
import { getSettings } from "@/gbc/services/settingsService";
import { TicketCards } from "@/gbc/components/admin/TicketCards";
import Link from "next/link";
import { Suspense } from "react";
import GBC2Navbar from "@/gbc/components/Navbar";
import { GBC_GRADIENTS, GBC_COLORS } from "@/gbc/colors";

// Force dynamic rendering - prevents static generation and caching
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TicketsPage() {
  const stats = await getTicketAvailability();

  // Fetch settings from database
  const settings = await getSettings();

  const isSoldOut = stats ? stats.availableTickets <= 0 : false;
  const totalTickets = stats ? stats.maxTickets : 0;

  // Access settings from the new JSON structure
  const earlyBirdPrice = settings?.tickets.earlyBirdPrice ?? 100000;
  const regularPrice = settings?.tickets.regularPrice ?? 120000;
  const companyPrice = settings?.tickets.companyPrice ?? 250000;
  const studentPrice = settings?.tickets.studentPrice ?? 20000;
  const maxEarlyBirdCapacity = settings?.tickets.maxEarlyBirdCapacity ?? 500;
  const maxStudentCapacity = settings?.tickets.maxStudentCapacity ?? 500;
  const earlyBirdDeadline = settings?.tickets.earlyBirdDeadline;
  const pauseTicketReg = settings?.tickets.pauseTicketReg ?? false;

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
  const studentInfoList = settings?.tickets.studentInfoList ?? [
    "Full conference access",
    "All keynote sessions",
    "Networking opportunities",
    "Certificate of attendance",
  ];

  const eventName =
    settings?.event.name ?? "Geospatial Builders Conference 2.0";
  const eventTheme =
    settings?.event.theme ??
    "Geospatial Capital: A Catalyst for Inclusive Growth";
  const eventDate = settings?.event.date ?? "2026-03-15";
  const eventVenue = settings?.event.venue ?? "Eko Hotel & Suites, Lagos";
  const eventTime = settings?.event.time ?? "09:00";

  return (
    <div className="min-h-screen bg-gray-50">
      <GBC2Navbar />

      {/* Hero Section */}
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
              Get Your Ticket
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-100 mb-6 sm:mb-8 px-2">
              Join us at {eventName} - {eventTheme}
            </p>

            {stats && !isSoldOut && !pauseTicketReg && (
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

      {pauseTicketReg ? (
        // Registration Paused Message
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="h-12 w-12 text-yellow-600" />
              </div>
              <h2 className="text-4xl font-bold mb-4">Registration Paused</h2>
              <p className="text-xl text-gray-600 mb-8">
                Ticket registration is currently paused. Please check back later
                or follow our social media channels for updates.
              </p>
            </div>
          </div>
        </section>
      ) : isSoldOut ? (
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
          <section className="py-12 sm:py-16 bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-5xl mx-auto">
                <TicketCards
                  earlyBirdPrice={earlyBirdPrice}
                  regularPrice={regularPrice}
                  companyPrice={companyPrice}
                  studentPrice={studentPrice}
                  maxEarlyBirdCapacity={maxEarlyBirdCapacity}
                  maxStudentCapacity={maxStudentCapacity}
                  earlyBirdDeadline={earlyBirdDeadline}
                  earlyBirdInfoList={earlyBirdInfoList}
                  regularInfoList={regularInfoList}
                  companyInfoList={companyInfoList}
                  studentInfoList={studentInfoList}
                  stats={stats}
                />
              </div>
            </div>
          </section>

          {/* Registration Form */}
          <section id="registration-form" className="py-12 sm:py-16 bg-gray-50">
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

                <Suspense fallback={<div>Loading form...</div>}>
                  <GBCTicketPurchaseForm
                    ticketSettings={settings?.tickets}
                    stats={stats}
                  />
                </Suspense>
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

                <div
                  className="mt-6 sm:mt-8 p-4 sm:p-6 rounded-r-lg border-l-4"
                  style={{
                    background: GBC_COLORS.surface.main,
                    borderColor: GBC_COLORS.primary.main,
                  }}
                >
                  <h3
                    className="font-bold mb-2 sm:mb-3 text-base sm:text-lg"
                    style={{ color: GBC_COLORS.primary.dark }}
                  >
                    📍 Event Details
                  </h3>
                  <ul
                    className="space-y-1.5 sm:space-y-2 text-sm sm:text-base"
                    style={{ color: GBC_COLORS.primary.dark }}
                  >
                    <li>
                      <strong>Date:</strong> {eventDate}
                    </li>
                    <li>
                      <strong>Venue:</strong> {eventVenue}
                    </li>
                    <li>
                      <strong>Time:</strong> {eventTime}
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
