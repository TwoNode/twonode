import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  Download,
  Mail,
  Calendar,
  ArrowLeft,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { verifyPayment } from "@/gbc/services/ticketService";
import { getSettings } from "@/gbc/services/settingsService";
import { notFound, redirect } from "next/navigation";
import { GBC_COLORS, GBC_GRADIENTS } from "@/gbc/colors";

export default async function TicketSuccessPage({
  searchParams,
}: {
  searchParams: { reference?: string };
}) {
  const reference = (await searchParams)?.reference;

  if (!reference) {
    redirect("/gbc/tickets");
  }

  // Verify the payment
  let verification: Awaited<ReturnType<typeof verifyPayment>>;
  try {
    verification = await verifyPayment(reference);
  } catch (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <h2 className="mt-3 text-2xl font-bold text-gray-900">
            Payment Verification Failed
          </h2>
          <p className="mt-2 text-gray-600">
            {error instanceof Error
              ? error.message
              : "Unable to verify your payment. Please try again or contact support if the issue persists."}
          </p>
          <div className="mt-6">
            <Link href="/gbc/tickets">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Tickets
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Extract ticket data from verification response
  const { tickets, count, amount } = verification;
  const primaryTicket = tickets[0]; // Get the first ticket (or primary ticket for groups)
  const isGroupTicket = count > 1;

  // Fetch settings for event details
  const settings = await getSettings();

  const eventDate = settings?.event.date ?? "2025-05-15";
  const eventTime = settings?.event.time ?? "09:00";
  const eventVenue = settings?.event.venue ?? "Eko Hotel & Suites, Lagos";
  const contactEmail = settings?.contact?.email ?? "info@twonodetechnologies.com";

  // Format the date
  const eventDateTime = new Date(`${eventDate}T${eventTime}:00`);
  const formattedDate = eventDateTime.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedTime = eventDateTime.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="min-h-screen bg-linear-to-b from-purple-50 to-white flex items-center justify-center py-12 px-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          {/* Header */}
          <div className="p-6 text-white" style={{ background: GBC_GRADIENTS.primary }}>
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="h-8 w-8 text-green-300" />
              <h1 className="text-2xl md:text-3xl font-bold">
                Payment Successful!
              </h1>
            </div>
            <p className="text-purple-100">
              {isGroupTicket
                ? `Your ${count} tickets for GBC 2.0 have been confirmed`
                : "Your ticket for GBC 2.0 has been confirmed"}
            </p>
          </div>

          <div className="p-6 md:p-8">
            <div
              className="rounded-lg p-4 mb-6 border"
              style={{ background: GBC_COLORS.surface.main, borderColor: GBC_COLORS.primary.light }}
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: GBC_COLORS.primary.dark }}>
                    Ticket Number{isGroupTicket ? "s" : ""}
                  </p>
                  <p className="font-mono font-bold" style={{ color: GBC_COLORS.primary.dark }}>
                    {isGroupTicket
                      ? tickets.map((t) => t.ticketNumber).join(", ")
                      : primaryTicket.ticketNumber}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: GBC_COLORS.primary.dark }}>
                    Payment Reference
                  </p>
                  <p className="font-mono text-sm break-all" style={{ color: GBC_COLORS.primary.dark }}>
                    {reference}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: GBC_COLORS.primary.dark }}>
                    Amount Paid
                  </p>
                  <p className="font-bold" style={{ color: GBC_COLORS.primary.dark }}>
                    ₦{amount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: GBC_COLORS.primary.dark }}>
                    Status
                  </p>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Confirmed
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3 text-gray-700">
                <div className="mt-0.5">
                  <div className="p-2 bg-green-100 rounded-full">
                    <Mail className="h-5 w-5 text-green-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-medium">Check your email</h3>
                  <p className="text-sm text-gray-500">
                    We've sent your ticket{isGroupTicket ? "s" : ""} and QR code
                    {isGroupTicket ? "s" : ""} to {primaryTicket.email}
                    {isGroupTicket && " and all other attendees"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-gray-700">
                <div className="mt-0.5">
                  <div className="p-2 bg-purple-100 rounded-full">
                    <Download className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-medium">Payment receipt</h3>
                  <p className="text-sm text-gray-500">
                    <a
                      href={`/api/v1/gbc/tickets/${primaryTicket.ticketNumber}/receipt-pdf`}
                      className="text-purple-600 hover:underline"
                    >
                      Download your receipt
                    </a>
                    {isGroupTicket && " (also attached to each attendee's confirmation email)"}
                  </p>
                </div>
              </div>

              {primaryTicket.qrCode && (
                <div className="flex items-start gap-3 text-gray-700">
                  <div className="mt-0.5">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <Download className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium">
                      Download your ticket{isGroupTicket ? "s" : ""}
                    </h3>
                    <p className="text-sm text-gray-500">
                      <a
                        href={primaryTicket.qrCode}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Click here to download your QR code
                      </a>
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 text-gray-700">
                <div className="mt-0.5">
                  <div className="p-2 bg-yellow-100 rounded-full">
                    <Calendar className="h-5 w-5 text-yellow-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-medium">Save the date</h3>
                  <p className="text-sm text-gray-500">
                    {formattedDate} at {formattedTime}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">📍 {eventVenue}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-6 mb-8">
              <h3 className="font-bold text-lg mb-4" style={{ color: GBC_COLORS.primary.main }}>
                What's Next?
              </h3>
              <ol className="space-y-3 text-gray-600">
                <li className="flex gap-3">
                  <span
                    className="shrink-0 flex items-center justify-center h-6 w-6 rounded-full text-sm font-medium"
                    style={{ background: GBC_COLORS.surface.main, color: GBC_COLORS.primary.dark }}
                  >
                    1
                  </span>
                  <span>
                    You'll receive a confirmation email with your QR code ticket
                  </span>
                </li>
                <li className="flex gap-3">
                  <span
                    className="shrink-0 flex items-center justify-center h-6 w-6 rounded-full text-sm font-medium"
                    style={{ background: GBC_COLORS.surface.main, color: GBC_COLORS.primary.dark }}
                  >
                    2
                  </span>
                  <span>Save the QR code on your phone or print it</span>
                </li>
                <li className="flex gap-3">
                  <span
                    className="shrink-0 flex items-center justify-center h-6 w-6 rounded-full text-sm font-medium"
                    style={{ background: GBC_COLORS.surface.main, color: GBC_COLORS.primary.dark }}
                  >
                    3
                  </span>
                  <span>Bring a valid ID to the event for verification</span>
                </li>
                <li className="flex gap-3">
                  <span
                    className="shrink-0 flex items-center justify-center h-6 w-6 rounded-full text-sm font-medium"
                    style={{ background: GBC_COLORS.surface.main, color: GBC_COLORS.primary.dark }}
                  >
                    4
                  </span>
                  <span>Present your QR code at the entrance for check-in</span>
                </li>
              </ol>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/gbc" className="flex-1">
                <Button variant="outline" className="w-full" size="lg">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Home
                </Button>
              </Link>
              <Link href="/gbc/contact" className="flex-1">
                <Button
                  className="w-full text-white hover:brightness-110"
                  style={{ background: GBC_GRADIENTS.primary }}
                  size="lg"
                >
                  Contact Support
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Didn't receive your ticket? Check your spam folder or contact us at{" "}
            <a
              href={`mailto:${contactEmail}`}
              className="hover:underline"
              style={{ color: GBC_COLORS.primary.main }}
            >
              {contactEmail}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
