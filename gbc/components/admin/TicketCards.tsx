"use client";

import { useRouter } from "next/navigation";
import { Check, AlertCircle } from "lucide-react";
import { isTicketTypeAvailable } from "@/gbc/utils";
import { GBC_COLORS } from "@/gbc/colors";

interface TicketCardsProps {
  earlyBirdPrice: number;
  regularPrice: number;
  companyPrice: number;
  studentPrice: number;
  maxEarlyBirdCapacity: number;
  maxStudentCapacity?: number;
  earlyBirdDeadline?: string;
  earlyBirdInfoList: string[];
  regularInfoList: string[];
  companyInfoList: string[];
  studentInfoList: string[];
  stats?: {
    soldEarlyBirdTickets: number;
    totalTickets?: number;
    completedTickets?: number;
    pendingTickets?: number;
    checkedInTickets?: number;
    availableTickets?: number;
    totalRevenue?: number;
    maxTickets?: number;
  } | null;
}

export function TicketCards({
  earlyBirdPrice,
  regularPrice,
  companyPrice,
  studentPrice,
  maxEarlyBirdCapacity,
  maxStudentCapacity,
  earlyBirdDeadline,
  earlyBirdInfoList,
  regularInfoList,
  companyInfoList,
  studentInfoList,
  stats,
}: TicketCardsProps) {
  const router = useRouter();

  // Get sold early bird tickets count from stats
  const soldEarlyBirdTickets = stats?.soldEarlyBirdTickets ?? 0;

  // Check ticket availability
  const earlyBirdAvailability = isTicketTypeAvailable(
    "EARLY_BIRD",
    soldEarlyBirdTickets,
    { maxEarlyBirdCapacity, earlyBirdDeadline }
  );
  const regularAvailability = isTicketTypeAvailable(
    "REGULAR",
    soldEarlyBirdTickets,
    { maxEarlyBirdCapacity, earlyBirdDeadline }
  );
  const companyAvailability = isTicketTypeAvailable(
    "COMPANY",
    soldEarlyBirdTickets,
    { maxEarlyBirdCapacity, earlyBirdDeadline }
  );
  const studentAvailability = isTicketTypeAvailable("STUDENT", 0, {});

  const scrollToForm = (tier: string) => {
    const formElement = document.getElementById("registration-form");
    if (formElement) {
      formElement.scrollIntoView({ behavior: "smooth", block: "start" });
      router.push(`/gbc/tickets?tier=${tier}`, { scroll: false });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-12 sm:mb-16">
      {/* Early Bird Ticket */}
      <div
        onClick={() =>
          earlyBirdAvailability.available && scrollToForm("early_bird")
        }
        className={`bg-white rounded-2xl p-4 sm:p-6 border-2 relative overflow-hidden transition-all duration-200 ${
          earlyBirdAvailability.available
            ? "cursor-pointer border-[#EEE1FA] hover:border-[#A78BFA] hover:shadow-lg"
            : "opacity-60 cursor-not-allowed border-[#EEE1FA]"
        }`}
      >
        {earlyBirdAvailability.available ? (
          <div
            className="absolute top-0 right-0 text-white px-2 sm:px-3 py-1 text-xs font-bold"
            style={{ background: GBC_COLORS.primary.main }}
          >
            AVAILABLE
          </div>
        ) : (
          <div className="absolute top-0 right-0 bg-red-500 text-white px-2 sm:px-3 py-1 text-xs font-bold">
            SOLD OUT
          </div>
        )}

        <div className="text-center mb-3 sm:mb-4">
          <div
            className="text-[10px] font-bold uppercase tracking-wider mb-1"
            style={{ color: GBC_COLORS.secondary.dark }}
          >
            Early Bird
          </div>
          <h3 className="text-xl sm:text-2xl font-bold mb-2">
            Single Ticket (One Attendee)
          </h3>
          <div
            className="text-3xl sm:text-4xl font-bold mb-2"
            style={{ color: GBC_COLORS.primary.main }}
          >
            ₦{(earlyBirdPrice / 1000).toFixed(0)}K
          </div>
          <p className="text-sm text-gray-600">
            Limited to {maxEarlyBirdCapacity} seats
          </p>
        </div>

        <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm mb-3">
          {earlyBirdInfoList.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-1.5 sm:gap-2">
              <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 shrink-0 mt-0.5" />
              <span className="text-gray-700">{feature}</span>
            </li>
          ))}
        </ul>

        {!earlyBirdAvailability.available && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
            <p className="text-xs text-red-800">
              {earlyBirdAvailability.reason}
            </p>
          </div>
        )}
      </div>

      {/* Regular Ticket */}
      <div
        onClick={() => regularAvailability.available && scrollToForm("regular")}
        className={`rounded-2xl p-4 sm:p-6 border-2 relative overflow-hidden transition-all duration-200 ${
          regularAvailability.available
            ? "cursor-pointer border-[#7C3AED] hover:shadow-lg"
            : "opacity-60 cursor-not-allowed border-[#EEE1FA]"
        }`}
        style={{
          background: regularAvailability.available
            ? GBC_COLORS.surface.main
            : "#fff",
        }}
      >
        {regularAvailability.available ? (
          <div
            className="absolute top-0 right-0 text-white px-2 sm:px-3 py-1 text-xs font-bold"
            style={{ background: GBC_COLORS.secondary.main }}
          >
            MOST POPULAR
          </div>
        ) : (
          <div className="absolute top-0 right-0 bg-gray-400 text-white px-2 sm:px-3 py-1 text-xs font-bold">
            NOT YET AVAILABLE
          </div>
        )}

        <div className="text-center mb-3 sm:mb-4">
          <div
            className="text-[10px] font-bold uppercase tracking-wider mb-1"
            style={{ color: GBC_COLORS.secondary.dark }}
          >
            Regular
          </div>
          <h3 className="text-xl sm:text-2xl font-bold mb-2">
            Pair Ticket (Two attendees)
          </h3>
          <div
            className="text-3xl sm:text-4xl font-bold mb-2"
            style={{ color: GBC_COLORS.primary.main }}
          >
            ₦{(regularPrice / 1000).toFixed(0)}K
          </div>
          <p className="text-sm text-gray-600">
            {regularAvailability.available
              ? "Standard pricing for 2"
              : "Available after single ticket sells out"}
          </p>
        </div>

        <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm mb-3">
          {regularInfoList.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-1.5 sm:gap-2">
              <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 shrink-0 mt-0.5" />
              <span className="text-gray-700">{feature}</span>
            </li>
          ))}
        </ul>

        {!regularAvailability.available && (
          <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-gray-500 mt-0.5 shrink-0" />
            <p className="text-xs text-gray-600">
              {regularAvailability.reason}
            </p>
          </div>
        )}
      </div>

      {/* Company/Group Ticket */}
      <div
        onClick={() => scrollToForm("company")}
        className="bg-white rounded-2xl p-4 sm:p-6 border-2 border-[#EEE1FA] relative overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200"
        style={{ borderColor: "#EEE1FA" }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.borderColor = GBC_COLORS.primary.light)
        }
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#EEE1FA")}
      >
        <div className="absolute top-0 right-0 bg-green-600 text-white px-2 sm:px-3 py-1 text-xs font-bold">
          ALWAYS AVAILABLE
        </div>

        <div className="text-center mb-3 sm:mb-4">
          <div
            className="text-[10px] font-bold uppercase tracking-wider mb-1"
            style={{ color: GBC_COLORS.secondary.dark }}
          >
            Company
          </div>
          <h3 className="text-xl sm:text-2xl font-bold mb-2">
            Group Ticket (Five Attendees)
          </h3>
          <div
            className="text-3xl sm:text-4xl font-bold mb-2"
            style={{ color: GBC_COLORS.primary.main }}
          >
            ₦{(companyPrice / 1000).toFixed(0)}K
          </div>
          <p className="text-sm text-gray-600">5 attendees</p>
        </div>

        <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
          {companyInfoList.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-1.5 sm:gap-2">
              <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 shrink-0 mt-0.5" />
              <span className="text-gray-700">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Student Ticket */}
      <div
        onClick={() => scrollToForm("student")}
        className="bg-white rounded-2xl p-4 sm:p-6 border-2 relative overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200"
        style={{ borderColor: "#EEE1FA" }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.borderColor = GBC_COLORS.primary.light)
        }
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#EEE1FA")}
      >
        <div className="absolute top-0 right-0 bg-green-600 text-white px-2 sm:px-3 py-1 text-xs font-bold">
          ALWAYS AVAILABLE
        </div>

        <div className="text-center mb-3 sm:mb-4">
          <div
            className="text-[10px] font-bold uppercase tracking-wider mb-1"
            style={{ color: GBC_COLORS.secondary.dark }}
          >
            Student
          </div>
          <h3 className="text-xl sm:text-2xl font-bold mb-2">Student Ticket</h3>
          <div
            className="text-3xl sm:text-4xl font-bold mb-2"
            style={{ color: GBC_COLORS.primary.main }}
          >
            ₦{(studentPrice / 1000).toFixed(0)}K
          </div>
          <p className="text-sm text-gray-600">Valid ID required</p>
        </div>

        <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
          {studentInfoList.map((feature, idx) => (
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
