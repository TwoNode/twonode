"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  createGBCTicket,
  createGBCGroupTicket,
  createGBCPairTicket,
  verifyGBCPayment,
} from "../actions/ticket-actions";
import { ShoppingCart, Loader2, Users, AlertCircle } from "lucide-react";
import { isTicketTypeAvailable } from "../utils";

type PaystackPop = any;

interface Attendee {
  name: string;
  email: string;
  phone: string;
  gender: string;
  profession: string;
  otherProfession?: string;
  isPrimary?: boolean;
}

export function GBCTicketPurchaseForm({
  ticketSettings,
  stats,
}: {
  ticketSettings: any;
  stats: any;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [selectedProfession, setSelectedProfession] = useState("");
  const [otherProfession, setOtherProfession] = useState("");
  const [selectedTicketType, setSelectedTicketType] = useState("EARLY_BIRD");
  const [paystack, setPaystack] = useState<PaystackPop | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([
    {
      name: "",
      email: "",
      phone: "",
      gender: "",
      profession: "",
      otherProfession: "",
      isPrimary: true, // First attendee is primary by default
    },
    {
      name: "",
      email: "",
      phone: "",
      gender: "",
      profession: "",
      otherProfession: "",
      isPrimary: false,
    },
    {
      name: "",
      email: "",
      phone: "",
      gender: "",
      profession: "",
      otherProfession: "",
      isPrimary: false,
    },
    {
      name: "",
      email: "",
      phone: "",
      gender: "",
      profession: "",
      otherProfession: "",
      isPrimary: false,
    },
    {
      name: "",
      email: "",
      phone: "",
      gender: "",
      profession: "",
      otherProfession: "",
      isPrimary: false,
    },
  ]);
  const [pairAttendees, setPairAttendees] = useState<Attendee[]>([
    {
      name: "",
      email: "",
      phone: "",
      gender: "",
      profession: "",
      otherProfession: "",
      isPrimary: true,
    },
    {
      name: "",
      email: "",
      phone: "",
      gender: "",
      profession: "",
      otherProfession: "",
      isPrimary: false,
    },
  ]);

  // Access settings from the new JSON structure
  const earlyBirdPrice = ticketSettings?.earlyBirdPrice ?? 100000;
  const regularPrice = ticketSettings?.regularPrice ?? 120000;
  const companyPrice = ticketSettings?.companyPrice ?? 250000;
  const studentPrice = ticketSettings?.studentPrice ?? 20000;
  const maxEarlyBirdCapacity = ticketSettings?.maxEarlyBirdCapacity ?? 500;
  const earlyBirdDeadline = ticketSettings?.earlyBirdDeadline;
  const pauseTicketReg = ticketSettings?.pauseTicketReg ?? false;

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

  useEffect(() => {
    const loadPaystack = async () => {
      try {
        if (typeof window !== "undefined") {
          const PaystackPop = (await import("@paystack/inline-js")).default;
          setPaystack(new PaystackPop());
        }
      } catch (error) {
        console.error("Failed to load Paystack:", error);
        setFormError(
          "Failed to initialize payment service. Please refresh the page or try again later."
        );
      }
    };

    loadPaystack();
  }, []);

  // Handle URL parameters for pre-selecting ticket tier
  // Handle URL parameters for pre-selecting ticket tier
  useEffect(() => {
    const tier = searchParams.get("tier");
    if (tier) {
      const requestedType = tier.toUpperCase();

      // Check if the requested ticket type is available
      if (requestedType === "REGULAR" && !regularAvailability.available) {
        // If regular is requested but not available, default to early bird if available
        if (earlyBirdAvailability.available) {
          setSelectedTicketType("EARLY_BIRD");
          toast.info(
            "Regular tickets are not yet available. Early Bird ticket selected instead.",
            { duration: 5000 }
          );
        } else {
          // If early bird is also not available, try company
          setSelectedTicketType("COMPANY");
          toast.info(
            "Regular and Early Bird tickets are not available. Company ticket selected.",
            { duration: 5000 }
          );
        }
      } else if (
        requestedType === "EARLY_BIRD" &&
        !earlyBirdAvailability.available
      ) {
        // If early bird is requested but sold out, default to regular if available
        if (regularAvailability.available) {
          setSelectedTicketType("REGULAR");
          toast.info(
            "Early Bird tickets are sold out. Regular ticket selected instead.",
            { duration: 5000 }
          );
        } else {
          setSelectedTicketType("COMPANY");
          toast.info(
            "Early Bird tickets are sold out. Company ticket selected.",
            { duration: 5000 }
          );
        }
      } else {
        // Requested type is available, use it
        setSelectedTicketType(requestedType);
      }
    }
  }, [searchParams, earlyBirdAvailability, regularAvailability]);

  // Update attendee field
  const updateAttendee = (
    index: number,
    field: keyof Attendee,
    value: string
  ) => {
    const newAttendees = [...attendees];
    newAttendees[index] = { ...newAttendees[index], [field]: value };
    setAttendees(newAttendees);
  };

  // Update pair attendee field
  const updatePairAttendee = (
    index: number,
    field: keyof Attendee,
    value: string
  ) => {
    const newAttendees = [...pairAttendees];
    newAttendees[index] = { ...newAttendees[index], [field]: value };
    setPairAttendees(newAttendees);
  };

  // Set primary attendee (ensure only one is primary)
  const setPrimaryAttendee = (index: number) => {
    const newAttendees = attendees.map((attendee, i) => ({
      ...attendee,
      isPrimary: i === index,
    }));
    setAttendees(newAttendees);
  };

  // Set primary pair attendee
  const setPrimaryPairAttendee = (index: number) => {
    const newAttendees = pairAttendees.map((attendee, i) => ({
      ...attendee,
      isPrimary: i === index,
    }));
    setPairAttendees(newAttendees);
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setIsSubmitting(true);
    setFormError(null);
    setPaymentError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const ticketType = formData.get("ticketType") as string;

      let result: any;
      let reference: string;
      let totalPrice: number;
      let primaryEmail: string;
      let primaryName: string;

      // Handle Pair/Regular tickets (2 attendees)
      if (ticketType === "REGULAR") {
        const validAttendees = pairAttendees.filter(
          (a) => a.name && a.email && a.gender && a.profession
        );

        if (validAttendees.length !== 2) {
          throw new Error("Please fill in both attendees' information");
        }

        const primaryAttendees = validAttendees.filter((a) => a.isPrimary);
        if (primaryAttendees.length === 0) {
          throw new Error("Please select a primary contact for the pair");
        }
        if (primaryAttendees.length > 1) {
          throw new Error("Only one attendee can be marked as primary contact");
        }

        const primaryAttendee = primaryAttendees[0];

        result = await createGBCPairTicket(validAttendees);

        if (!result.success || !result.data) {
          throw new Error(result.error || "Failed to create pair tickets");
        }

        reference = result.data.reference;
        totalPrice = result.data.tickets[0].price * 2;
        primaryEmail = primaryAttendee.email;
        primaryName = primaryAttendee.name;
      } else if (ticketType === "COMPANY") {
        // Handle Group/Company tickets (5 attendees)
        // Validate all attendees have required fields
        const validAttendees = attendees.filter(
          (a) => a.name && a.email && a.gender && a.profession
        );

        if (validAttendees.length !== 5) {
          throw new Error("Please fill in all 5 attendees' information");
        }

        // Ensure exactly one primary attendee is selected
        const primaryAttendees = validAttendees.filter((a) => a.isPrimary);
        if (primaryAttendees.length === 0) {
          throw new Error("Please select a primary contact for the group");
        }
        if (primaryAttendees.length > 1) {
          throw new Error("Only one attendee can be marked as primary contact");
        }

        const primaryAttendee = primaryAttendees[0];

        result = await createGBCGroupTicket(validAttendees);

        if (!result.success || !result.data) {
          throw new Error(result.error || "Failed to create group tickets");
        }

        reference = result.data.reference;
        totalPrice = result.data.tickets[0].price * 5; // Total price for all 5
        primaryEmail = primaryAttendee.email;
        primaryName = primaryAttendee.name;
      } else {
        // Regular individual ticket
        result = await createGBCTicket(formData);

        if (!result.success || !result.data) {
          throw new Error(result.error || "Failed to create ticket");
        }

        const { ticket } = result.data;
        reference = result.data.reference;
        totalPrice = ticket.price;
        primaryEmail = formData.get("email") as string;
        primaryName = formData.get("name") as string;
      }

      const amountInKobo = totalPrice * 100;

      if (!paystack) {
        throw new Error("Payment service is not available");
      }

      // Show loading state for payment initialization
      toast.loading("Initializing payment...");

      paystack.newTransaction({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "",
        email: primaryEmail,
        amount: amountInKobo,
        reference,
        firstName: primaryName.split(" ")[0],
        lastName: primaryName.split(" ").slice(1).join(" ") || "Customer",
        onSuccess: async (transaction: any) => {
          toast.dismiss();

          // Extract reference from transaction object or fallback to our reference variable
          const paymentRef = transaction?.reference || reference;
          console.log("Transaction object:", transaction);
          console.log("Payment reference:", paymentRef);

          if (!paymentRef) {
            toast.error(
              "Payment reference is missing. Please contact support."
            );
            console.error(
              "Missing reference - transaction:",
              transaction,
              "reference var:",
              reference
            );
            return;
          }

          toast.success("Payment successful! Verifying... " + paymentRef);

          try {
            const verification = await verifyGBCPayment(paymentRef, true);
            if (!verification.success) {
              throw new Error(
                verification.error ||
                  "Payment verification failed " + paymentRef
              );
            }
            toast.success("Payment verified successfully!");
            router.push(`/gbc/tickets/success?reference=${paymentRef}`);
          } catch (error) {
            console.error("Verification error:", error);
            const errorMessage =
              error instanceof Error
                ? error.message
                : "Payment verification failed " + paymentRef;
            setPaymentError(errorMessage);
            toast.error(
              "Payment received but verification failed. Please contact support."
            );
          }
        },
        onCancel: () => {
          toast.dismiss();
          toast.info("Payment was cancelled");
        },
        onError: (error: any) => {
          console.error("Paystack error:", error);
          toast.dismiss();
          setPaymentError(
            error?.message || "An error occurred during payment processing"
          );
          toast.error("Payment processing failed. Please try again.");
        },
      });
    } catch (error) {
      console.error("Form submission error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      setFormError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  const isGroupTicket = selectedTicketType === "COMPANY";
  const isPairTicket = selectedTicketType === "REGULAR";

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 sm:space-y-6 bg-white p-4 sm:p-6 md:p-8 rounded-xl shadow-lg"
    >
      {/* Ticket Type Selection - Moved to top */}
      <div>
        <Label htmlFor="ticketType" className="text-sm sm:text-base">
          Ticket Type *
        </Label>
        <Select
          name="ticketType"
          required
          value={selectedTicketType}
          onValueChange={setSelectedTicketType}
          disabled={isSubmitting}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              value="EARLY_BIRD"
              disabled={!earlyBirdAvailability.available}
            >
              <div className="flex items-center justify-between w-full text-sm sm:text-base">
                <span
                  className={
                    !earlyBirdAvailability.available ? "text-gray-400" : ""
                  }
                >
                  Single Ticket (One Attendee)
                  {!earlyBirdAvailability.available && " (Sold Out)"}
                </span>
                <span
                  className={`ml-4 font-bold ${
                    !earlyBirdAvailability.available ? "text-gray-400" : ""
                  }`}
                >
                  ₦{(earlyBirdPrice / 1000).toFixed(0)}K
                </span>
              </div>
            </SelectItem>
            <SelectItem
              value="REGULAR"
              disabled={!regularAvailability.available}
            >
              <div className="flex items-center justify-between w-full text-sm sm:text-base">
                <span
                  className={
                    !regularAvailability.available ? "text-gray-400" : ""
                  }
                >
                  Pair Ticket (Two attendees)
                  {!regularAvailability.available && " (Not Yet Available)"}
                </span>
                <span
                  className={`ml-4 font-bold ${
                    !regularAvailability.available ? "text-gray-400" : ""
                  }`}
                >
                  ₦{(regularPrice / 1000).toFixed(0)}K
                </span>
              </div>
            </SelectItem>
            <SelectItem
              value="COMPANY"
              disabled={!companyAvailability.available}
            >
              <div className="flex items-center justify-between w-full text-sm sm:text-base">
                <span
                  className={
                    !companyAvailability.available ? "text-gray-400" : ""
                  }
                >
                  Group Ticket (Five Attendees)
                </span>
                <span
                  className={`ml-4 font-bold ${
                    !companyAvailability.available ? "text-gray-400" : ""
                  }`}
                >
                  ₦{(companyPrice / 1000).toFixed(0)}K
                </span>
              </div>
            </SelectItem>
            <SelectItem
              value="STUDENT"
              disabled={!studentAvailability.available}
            >
              <div className="flex items-center justify-between w-full text-sm sm:text-base">
                <span
                  className={
                    !studentAvailability.available ? "text-gray-400" : ""
                  }
                >
                  Student Ticket (Valid ID required)
                </span>
                <span
                  className={`ml-4 font-bold ${
                    !studentAvailability.available ? "text-gray-400" : ""
                  }`}
                >
                  ₦{(studentPrice / 1000).toFixed(0)}K
                </span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Availability Messages */}
        {!regularAvailability.available && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-xs sm:text-sm text-blue-800">
              {regularAvailability.reason}
            </p>
          </div>
        )}

        {!earlyBirdAvailability.available && regularAvailability.available && (
          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
            <p className="text-xs sm:text-sm text-green-800">
              Single tickets are sold out. Pair tickets are now
              available!
            </p>
          </div>
        )}

        {isGroupTicket && (
          <div className="space-y-2 mt-2">
            <p className="text-xs sm:text-sm text-purple-600 flex items-center gap-1">
              <Users className="h-4 w-4" />
              Group ticket includes 5 attendees. Please fill in details for all
              5 people below.
            </p>
            <p className="text-xs sm:text-sm text-purple-800 bg-purple-100 p-2 rounded border border-purple-300">
              <strong>Note:</strong> The primary contact will receive the
              payment confirmation and be the main point of contact for this
              group booking.
            </p>
          </div>
        )}

        {isPairTicket && (
          <div className="space-y-2 mt-2">
            <p className="text-xs sm:text-sm text-blue-600 flex items-center gap-1">
              <Users className="h-4 w-4" />
              Pair ticket includes 2 attendees. Please fill in details for both
              people below.
            </p>
            <p className="text-xs sm:text-sm text-blue-800 bg-blue-100 p-2 rounded border border-blue-300">
              <strong>Note:</strong> The primary contact will receive the
              payment confirmation and be the main point of contact for this
              pair booking.
            </p>
          </div>
        )}
      </div>

      {/* Conditional Rendering: Group Ticket, Pair Ticket, or Individual Ticket */}
      {isGroupTicket ? (
        // GROUP TICKET FORM (5 Attendees)
        <div className="space-y-6">
          {attendees.map((attendee, index) => (
            <div
              key={index}
              className={`p-4 border-2 rounded-lg ${
                attendee.isPrimary
                  ? "border-purple-500 bg-purple-100/50"
                  : "border-purple-200 bg-purple-50/50"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  Attendee {index + 1}
                </h3>

                {/* Primary Contact Radio Button */}
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id={`primary-${index}`}
                    name="primaryContact"
                    checked={attendee.isPrimary || false}
                    onChange={() => setPrimaryAttendee(index)}
                    disabled={isSubmitting}
                    className="w-4 h-4 text-purple-600 cursor-pointer"
                  />
                  <Label
                    htmlFor={`primary-${index}`}
                    className="text-sm font-semibold text-purple-700 cursor-pointer"
                  >
                    Primary Contact
                  </Label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <Label className="text-sm">Full Name *</Label>
                  <Input
                    required
                    placeholder="John Doe"
                    value={attendee.name}
                    onChange={(e) =>
                      updateAttendee(index, "name", e.target.value)
                    }
                    disabled={isSubmitting}
                    className="mt-1"
                  />
                </div>

                {/* Email */}
                <div>
                  <Label className="text-sm">Email Address *</Label>
                  <Input
                    type="email"
                    required
                    placeholder="john@example.com"
                    value={attendee.email}
                    onChange={(e) =>
                      updateAttendee(index, "email", e.target.value)
                    }
                    disabled={isSubmitting}
                    className="mt-1"
                  />
                </div>

                {/* Phone */}
                <div>
                  <Label className="text-sm">Phone Number (Optional)</Label>
                  <Input
                    type="tel"
                    placeholder="08012345678"
                    value={attendee.phone}
                    onChange={(e) =>
                      updateAttendee(index, "phone", e.target.value)
                    }
                    disabled={isSubmitting}
                    maxLength={11}
                    className="mt-1"
                  />
                </div>

                {/* Gender */}
                <div>
                  <Label className="text-sm">Gender *</Label>
                  <Select
                    required
                    value={attendee.gender}
                    onValueChange={(value) =>
                      updateAttendee(index, "gender", value)
                    }
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                      <SelectItem value="PREFER_NOT_TO_SAY">
                        Prefer not to say
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Profession */}
                <div className="md:col-span-2">
                  <Label className="text-sm">Profession *</Label>
                  <Select
                    required
                    value={attendee.profession}
                    onValueChange={(value) =>
                      updateAttendee(index, "profession", value)
                    }
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select profession" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SURVEYOR">Surveyor</SelectItem>
                      <SelectItem value="GIS_ANALYST">GIS Analyst</SelectItem>
                      <SelectItem value="URBAN_PLANNER">
                        Urban Planner
                      </SelectItem>
                      <SelectItem value="LAWYER">Lawyer</SelectItem>
                      <SelectItem value="ENGINEER">Engineer</SelectItem>
                      <SelectItem value="ARCHITECT">Architect</SelectItem>
                      <SelectItem value="DATA_SCIENTIST">
                        Data Scientist
                      </SelectItem>
                      <SelectItem value="DEVELOPER">Developer</SelectItem>
                      <SelectItem value="PROJECT_MANAGER">
                        Project Manager
                      </SelectItem>
                      <SelectItem value="STUDENT">Student</SelectItem>
                      <SelectItem value="RESEARCHER">Researcher</SelectItem>
                      <SelectItem value="ENTREPRENEUR">Entrepreneur</SelectItem>
                      <SelectItem value="GOVERNMENT_OFFICIAL">
                        Government Official
                      </SelectItem>
                      <SelectItem value="NGO_STAFF">NGO Staff</SelectItem>
                      <SelectItem value="CONSULTANT">Consultant</SelectItem>
                      <SelectItem value="OTHER">
                        Other (please specify)
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {attendee.profession === "OTHER" && (
                    <div className="mt-2">
                      <Input
                        required
                        placeholder="Please specify your profession"
                        value={attendee.otherProfession || ""}
                        onChange={(e) =>
                          updateAttendee(
                            index,
                            "otherProfession",
                            e.target.value
                          )
                        }
                        disabled={isSubmitting}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : isPairTicket ? (
        // PAIR TICKET FORM (2 Attendees)
        <div className="space-y-6">
          {pairAttendees.map((attendee, index) => (
            <div
              key={index}
              className={`p-4 border-2 rounded-lg ${
                attendee.isPrimary
                  ? "border-blue-500 bg-blue-100/50"
                  : "border-blue-200 bg-blue-50/50"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Attendee {index + 1}
                </h3>

                {/* Primary Contact Radio Button */}
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id={`pair-primary-${index}`}
                    name="pairPrimaryContact"
                    checked={attendee.isPrimary || false}
                    onChange={() => setPrimaryPairAttendee(index)}
                    disabled={isSubmitting}
                    className="w-4 h-4 text-blue-600 cursor-pointer"
                  />
                  <Label
                    htmlFor={`pair-primary-${index}`}
                    className="text-sm font-semibold text-blue-700 cursor-pointer"
                  >
                    Primary Contact
                  </Label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <Label className="text-sm">Full Name *</Label>
                  <Input
                    required
                    placeholder="John Doe"
                    value={attendee.name}
                    onChange={(e) =>
                      updatePairAttendee(index, "name", e.target.value)
                    }
                    disabled={isSubmitting}
                    className="mt-1"
                  />
                </div>

                {/* Email */}
                <div>
                  <Label className="text-sm">Email Address *</Label>
                  <Input
                    type="email"
                    required
                    placeholder="john@example.com"
                    value={attendee.email}
                    onChange={(e) =>
                      updatePairAttendee(index, "email", e.target.value)
                    }
                    disabled={isSubmitting}
                    className="mt-1"
                  />
                </div>

                {/* Phone */}
                <div>
                  <Label className="text-sm">Phone Number (Optional)</Label>
                  <Input
                    type="tel"
                    placeholder="08012345678"
                    value={attendee.phone}
                    onChange={(e) =>
                      updatePairAttendee(index, "phone", e.target.value)
                    }
                    disabled={isSubmitting}
                    maxLength={11}
                    className="mt-1"
                  />
                </div>

                {/* Gender */}
                <div>
                  <Label className="text-sm">Gender *</Label>
                  <Select
                    required
                    value={attendee.gender}
                    onValueChange={(value) =>
                      updatePairAttendee(index, "gender", value)
                    }
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                      <SelectItem value="PREFER_NOT_TO_SAY">
                        Prefer not to say
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Profession */}
                <div className="md:col-span-2">
                  <Label className="text-sm">Profession *</Label>
                  <Select
                    required
                    value={attendee.profession}
                    onValueChange={(value) =>
                      updatePairAttendee(index, "profession", value)
                    }
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select profession" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SURVEYOR">Surveyor</SelectItem>
                      <SelectItem value="GIS_ANALYST">GIS Analyst</SelectItem>
                      <SelectItem value="URBAN_PLANNER">
                        Urban Planner
                      </SelectItem>
                      <SelectItem value="LAWYER">Lawyer</SelectItem>
                      <SelectItem value="ENGINEER">Engineer</SelectItem>
                      <SelectItem value="ARCHITECT">Architect</SelectItem>
                      <SelectItem value="DATA_SCIENTIST">
                        Data Scientist
                      </SelectItem>
                      <SelectItem value="DEVELOPER">Developer</SelectItem>
                      <SelectItem value="PROJECT_MANAGER">
                        Project Manager
                      </SelectItem>
                      <SelectItem value="STUDENT">Student</SelectItem>
                      <SelectItem value="RESEARCHER">Researcher</SelectItem>
                      <SelectItem value="ENTREPRENEUR">Entrepreneur</SelectItem>
                      <SelectItem value="GOVERNMENT_OFFICIAL">
                        Government Official
                      </SelectItem>
                      <SelectItem value="NGO_STAFF">NGO Staff</SelectItem>
                      <SelectItem value="CONSULTANT">Consultant</SelectItem>
                      <SelectItem value="OTHER">
                        Other (please specify)
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {attendee.profession === "OTHER" && (
                    <div className="mt-2">
                      <Input
                        required
                        placeholder="Please specify your profession"
                        value={attendee.otherProfession || ""}
                        onChange={(e) =>
                          updatePairAttendee(
                            index,
                            "otherProfession",
                            e.target.value
                          )
                        }
                        disabled={isSubmitting}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // INDIVIDUAL TICKET FORM
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Full Name */}
            <div>
              <Label htmlFor="name" className="text-sm sm:text-base">
                Full Name *
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                placeholder="John Doe"
                className="mt-1 text-sm sm:text-base"
                disabled={isSubmitting}
              />
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email" className="text-sm sm:text-base">
                Email Address *
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="john@example.com"
                className="mt-1 text-sm sm:text-base"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <Label htmlFor="phone" className="text-sm sm:text-base">
              Phone Number (Optional)
            </Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="e.g., 08012345678"
              className="mt-1 text-sm sm:text-base"
              disabled={isSubmitting}
              maxLength={11}
              pattern="[0-9]{11}"
              title="Please enter a valid 11-digit phone number"
            />
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              For SMS notifications and event updates (11 digits, no spaces or
              special characters)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Gender */}
            <div>
              <Label htmlFor="gender" className="text-sm sm:text-base">
                Gender *
              </Label>
              <Select name="gender" required disabled={isSubmitting}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                  <SelectItem value="PREFER_NOT_TO_SAY">
                    Prefer not to say
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Profession */}
            <div>
              <Label htmlFor="profession" className="text-sm sm:text-base">
                Profession *
              </Label>
              <Select
                name="profession"
                required
                value={selectedProfession}
                onValueChange={setSelectedProfession}
                disabled={isSubmitting}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select profession" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SURVEYOR">Surveyor</SelectItem>
                  <SelectItem value="GIS_ANALYST">GIS Analyst</SelectItem>
                  <SelectItem value="URBAN_PLANNER">Urban Planner</SelectItem>
                  <SelectItem value="LAWYER">Lawyer</SelectItem>
                  <SelectItem value="ENGINEER">Engineer</SelectItem>
                  <SelectItem value="ARCHITECT">Architect</SelectItem>
                  <SelectItem value="DATA_SCIENTIST">Data Scientist</SelectItem>
                  <SelectItem value="DEVELOPER">Developer</SelectItem>
                  <SelectItem value="PROJECT_MANAGER">
                    Project Manager
                  </SelectItem>
                  <SelectItem value="STUDENT">Student</SelectItem>{" "}
                  <SelectItem value="RESEARCHER">Researcher</SelectItem>
                  <SelectItem value="ENTREPRENEUR">Entrepreneur</SelectItem>
                  <SelectItem value="GOVERNMENT_OFFICIAL">
                    Government Official
                  </SelectItem>
                  <SelectItem value="NGO_STAFF">NGO Staff</SelectItem>
                  <SelectItem value="CONSULTANT">Consultant</SelectItem>
                  <SelectItem value="OTHER">Other (please specify)</SelectItem>
                </SelectContent>
              </Select>

              {/* Other Profession Input */}
              {selectedProfession === "OTHER" && (
                <div className="mt-2">
                  <Label
                    htmlFor="otherProfession"
                    className="text-sm sm:text-base"
                  >
                    Please specify your profession *
                  </Label>
                  <Input
                    id="otherProfession"
                    name="otherProfession"
                    placeholder="Enter your profession"
                    className="mt-1"
                    required
                    value={otherProfession}
                    onChange={(e) => setOtherProfession(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Terms and Conditions */}
      <div className="border-t pt-4 sm:pt-6">
        <div className="flex items-start space-x-3">
          <input
            type="checkbox"
            id="terms"
            required
            className="mt-1"
            disabled={isSubmitting}
          />
          <Label
            htmlFor="terms"
            className="text-xs sm:text-sm text-gray-600 cursor-pointer"
          >
            I agree to the terms and conditions and understand that tickets are
            non-refundable. I consent to receive event updates via email and
            SMS.
          </Label>
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting || !paystack}
        className="w-full btn-glow relative text-sm sm:text-base"
        size="lg"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            {isGroupTicket || isPairTicket ? (
              <Users className="mr-2 h-5 w-5" />
            ) : (
              <ShoppingCart className="mr-2 h-5 w-5" />
            )}
            {!paystack ? "Loading Payment..." : "Proceed to Payment"}
          </>
        )}
      </Button>

      {(formError || paymentError) && (
        <div className="mt-4 p-3 sm:p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
          <p className="font-medium">
            {formError ? "Form Error" : "Payment Error"}
          </p>
          <p className="text-sm">{formError || paymentError}</p>
          {paymentError && (
            <Button
              variant="link"
              className="text-red-700 p-0 h-auto mt-2"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          )}
        </div>
      )}
    </form>
  );
}
