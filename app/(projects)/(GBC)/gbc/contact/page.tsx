// src/app/(public)/contact/page.tsx
import Link from "next/link";
import { ContactForm } from "../../components/ContactForm";
import { Mail, MapPin, Phone, Clock, MessageCircle } from "lucide-react";
import { getAllGBCSettings } from "../../actions/settings-actions";
import GBC2Navbar from "../../components/Navbar";

export const metadata = {
  title: "Contact Us | GBC 2.0",
  description:
    "Get in touch with the GBC 2.0 team for inquiries about sponsorship, speaking opportunities, technical support, or general questions.",
};

export default async function ContactPage() {
  // Fetch settings from database
  const settingsResult = await getAllGBCSettings();
  const settings = settingsResult.success ? settingsResult.data : null;

  // Extract settings with fallbacks
  const eventName =
    settings?.event.name || "Geospatial Builders Conference 2.0";
  const eventDate = settings?.event.date || "2026-03-15";
  const eventVenue = settings?.event.venue || "Eko Hotel & Suites, Lagos";

  const contactEmail = settings?.contact.email || "info@twonodetechnologies.com";
  const contactPhone = settings?.contact.phone || "+234-916-0002-740";
  const contactCity = settings?.contact.city || "Lagos, Nigeria";
  const officeHours = settings?.contact.officeHours || "Mon-Fri 9AM-5PM";
  const responseTime = settings?.contact.responseTime || "24hrs";
  const satisfactionRate = settings?.contact.satisfactionRate || "98%";

  // Format event date for display
  const formattedDate = new Date(eventDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
      <GBC2Navbar />

      {/* Hero Section */}
      <section className="relative py-24 bg-linear-to-br from-purple-600 via-indigo-600 to-blue-600 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />

        {/* Animated background elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute top-40 right-10 w-72 h-72 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />

        {/* Back to Home Link */}
        <div className="absolute top-6 left-6 z-10">
          <Link
            href="/gbc"
            className="flex items-center text-white/80 hover:text-white transition-colors group"
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
              className="w-5 h-5 mr-1 transform group-hover:-translate-x-1 transition-transform"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            Back to Home
          </Link>
        </div>

        <div className="relative container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-block mb-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-full px-6 py-2 border border-white/20">
                <p className="text-sm font-semibold tracking-wide">
                  LET&apos;S CONNECT
                </p>
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Get in Touch
            </h1>
            <p className="text-xl md:text-2xl text-gray-100 leading-relaxed">
              Have a question or want to get involved? We&apos;d love to hear
              from you.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="py-12 -mt-16 relative z-10">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-4 max-w-6xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 border border-gray-100 group hover:scale-105">
              <div className="flex flex-col items-center text-center">
                <div className="bg-linear-to-br from-purple-100 to-purple-200 rounded-full p-4 mb-4 group-hover:scale-110 transition-transform">
                  <Mail className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1">Email Us</h3>
                <p className="text-sm text-gray-600">{contactEmail}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 border border-gray-100 group hover:scale-105">
              <div className="flex flex-col items-center text-center">
                <div className="bg-linear-to-br from-blue-100 to-blue-200 rounded-full p-4 mb-4 group-hover:scale-110 transition-transform">
                  <Phone className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1">Call Us</h3>
                <p className="text-sm text-gray-600">{contactPhone}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 border border-gray-100 group hover:scale-105">
              <div className="flex flex-col items-center text-center">
                <div className="bg-linear-to-br from-indigo-100 to-indigo-200 rounded-full p-4 mb-4 group-hover:scale-110 transition-transform">
                  <MapPin className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1">Visit Us</h3>
                <p className="text-sm text-gray-600">{contactCity}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 border border-gray-100 group hover:scale-105">
              <div className="flex flex-col items-center text-center">
                <div className="bg-linear-to-br from-green-100 to-green-200 rounded-full p-4 mb-4 group-hover:scale-110 transition-transform">
                  <Clock className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1">Office Hours</h3>
                <p className="text-sm text-gray-600">{officeHours}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Contact Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-start">
            {/* Contact Form */}
            <div className="order-2 lg:order-1">
              <ContactForm />
            </div>

            {/* Right Side - Why Contact Us */}
            <div className="order-1 lg:order-2 space-y-8">
              <div>
                <h2 className="text-3xl font-bold mb-4 text-gray-900">
                  How Can We Help?
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  Whether you&apos;re interested in sponsoring, speaking, or
                  simply want to learn more about {eventName}, we&apos;re here
                  to help. Fill out the form and we&apos;ll get back to you
                  within {responseTime}.
                </p>
              </div>

              {/* Inquiry Types */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-900">
                  Common Inquiries
                </h3>

                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-4 shadow-md border border-gray-100 hover:border-purple-200 transition-all">
                    <div className="flex items-start gap-3">
                      <div className="bg-purple-100 rounded-lg p-2 mt-1">
                        <MessageCircle className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">
                          General Inquiries
                        </h4>
                        <p className="text-sm text-gray-600">
                          Questions about the event, registration, or agenda
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-linear-to-br from-purple-50 to-indigo-50 rounded-lg p-4 shadow-md border border-purple-100 hover:border-purple-300 transition-all">
                    <div className="flex items-start gap-3">
                      <div className="bg-purple-600 rounded-lg p-2 mt-1">
                        <svg
                          className="h-5 w-5 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">
                          Sponsorship Opportunities
                        </h4>
                        <p className="text-sm text-gray-600">
                          Partner with us to reach Nigeria&apos;s geospatial
                          community
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 shadow-md border border-gray-100 hover:border-blue-200 transition-all">
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-100 rounded-lg p-2 mt-1">
                        <svg
                          className="h-5 w-5 text-blue-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">
                          Speaking Opportunities
                        </h4>
                        <p className="text-sm text-gray-600">
                          Share your expertise with industry leaders
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 shadow-md border border-gray-100 hover:border-indigo-200 transition-all">
                    <div className="flex items-start gap-3">
                      <div className="bg-indigo-100 rounded-lg p-2 mt-1">
                        <svg
                          className="h-5 w-5 text-indigo-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">
                          Media & Press
                        </h4>
                        <p className="text-sm text-gray-600">
                          Media inquiries and press credentials
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-linear-to-br from-purple-600 to-indigo-600 rounded-2xl p-8 text-white shadow-xl">
                <h3 className="text-2xl font-bold mb-6">Response Time</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-4xl font-bold mb-2">
                      {responseTime}
                    </div>
                    <p className="text-purple-100">Average response time</p>
                  </div>
                  <div>
                    <div className="text-4xl font-bold mb-2">
                      {satisfactionRate}
                    </div>
                    <p className="text-purple-100">Satisfaction rate</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
                Frequently Asked Questions
              </h2>
              <p className="text-gray-600">Quick answers to common questions</p>
            </div>

            <div className="space-y-4">
              <details className="group bg-gray-50 rounded-lg p-6 hover:bg-gray-100 transition-colors">
                <summary className="cursor-pointer font-semibold text-gray-900 flex items-center justify-between">
                  When is {eventName} taking place?
                  <svg
                    className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </summary>
                <p className="mt-4 text-gray-600">
                  {eventName} will be held on {formattedDate} at {eventVenue}.
                  Check our homepage for the most up-to-date information about
                  the event schedule.
                </p>
              </details>

              <details className="group bg-gray-50 rounded-lg p-6 hover:bg-gray-100 transition-colors">
                <summary className="cursor-pointer font-semibold text-gray-900 flex items-center justify-between">
                  How can I become a sponsor?
                  <svg
                    className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </summary>
                <p className="mt-4 text-gray-600">
                  Select &quot;Sponsorship&quot; in the inquiry type above and
                  provide details about your organization. Our team will reach
                  out with our sponsorship packages and benefits.
                </p>
              </details>

              <details className="group bg-gray-50 rounded-lg p-6 hover:bg-gray-100 transition-colors">
                <summary className="cursor-pointer font-semibold text-gray-900 flex items-center justify-between">
                  Are tickets still available?
                  <svg
                    className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </summary>
                <p className="mt-4 text-gray-600">
                  Visit our{" "}
                  <Link
                    href="/gbc/tickets"
                    className="text-purple-600 hover:underline font-semibold"
                  >
                    tickets page
                  </Link>{" "}
                  to check availability and purchase your tickets today!
                </p>
              </details>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
