"use client";

import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

interface TicketCardsProps {
  earlyBirdPrice: number;
  regularPrice: number;
  companyPrice: number;
}

export function TicketCards({
  earlyBirdPrice,
  regularPrice,
  companyPrice,
}: TicketCardsProps) {
  const router = useRouter();

  const scrollToForm = (tier: string) => {
    const formElement = document.getElementById("registration-form");
    if (formElement) {
      formElement.scrollIntoView({ behavior: "smooth", block: "start" });
      router.push(`/gbc2/tickets?tier=${tier}`, { scroll: false });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-16">
      {/* Early Bird Ticket */}
      <div
        onClick={() => scrollToForm("early_bird")}
        className="bg-linear-to-br from-purple-50 to-indigo-50 rounded-2xl p-4 sm:p-6 border-2 border-purple-200 relative overflow-hidden cursor-pointer hover:border-purple-400 hover:shadow-lg transition-all duration-200"
      >
        <div className="absolute top-0 right-0 bg-purple-600 text-white px-2 sm:px-3 py-1 text-xs font-bold">
          POPULAR
        </div>

        <div className="text-center mb-3 sm:mb-4">
          <h3 className="text-xl sm:text-2xl font-bold mb-2">Early Bird</h3>
          <div className="text-3xl sm:text-4xl font-bold text-purple-600 mb-2">
            ₦{(earlyBirdPrice / 1000).toFixed(0)}K
          </div>
          <p className="text-sm text-gray-600">Limited availability</p>
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
            <li key={idx} className="flex items-start gap-1.5 sm:gap-2">
              <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 shrink-0 mt-0.5" />
              <span className="text-gray-700">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Regular Ticket */}
      <div
        onClick={() => scrollToForm("regular")}
        className="bg-linear-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 sm:p-6 border-2 border-blue-200 cursor-pointer hover:border-blue-400 hover:shadow-lg transition-all duration-200"
      >
        <div className="text-center mb-3 sm:mb-4">
          <h3 className="text-xl sm:text-2xl font-bold mb-2">Regular</h3>
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
            <li key={idx} className="flex items-start gap-1.5 sm:gap-2">
              <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 shrink-0 mt-0.5" />
              <span className="text-gray-700">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Company/Group Ticket */}
      <div
        onClick={() => scrollToForm("company")}
        className="bg-linear-to-br from-amber-50 to-orange-50 rounded-2xl p-4 sm:p-6 border-2 border-amber-200 relative overflow-hidden cursor-pointer hover:border-amber-400 hover:shadow-lg transition-all duration-200"
      >
        <div className="absolute top-0 right-0 bg-amber-600 text-white px-2 sm:px-3 py-1 text-xs font-bold">
          PREMIUM
        </div>

        <div className="text-center mb-3 sm:mb-4">
          <h3 className="text-xl sm:text-2xl font-bold mb-2">Group</h3>
          <div className="text-3xl sm:text-4xl font-bold text-amber-600 mb-2">
            ₦{(companyPrice / 1000).toFixed(0)}K
          </div>
          <p className="text-sm text-gray-600">5 attendees</p>
        </div>

        <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
          {[
            "Tickets for 5 attendees",
            "Full conference access",
            "All keynote sessions",
            "Premium seating",
            "Company mention in materials",
            "Dedicated networking area",
            "VIP access to all sessions",
          ].map((feature, idx) => (
            <li key={idx} className="flex items-start gap-1.5 sm:gap-2">
              <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 shrink-0 mt-0.5" />
              <span className="text-gray-700">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
