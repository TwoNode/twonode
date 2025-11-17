"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
import { createGBCTicket, verifyGBCPayment } from "../actions/ticket-actions";
import { ShoppingCart, Loader2 } from "lucide-react";

type PaystackPop = any;

export function GBCTicketPurchaseForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [selectedProfession, setSelectedProfession] = useState("");
  const [otherProfession, setOtherProfession] = useState("");
  const [paystack, setPaystack] = useState<PaystackPop | null>(null);

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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setIsSubmitting(true);
    setFormError(null);
    setPaymentError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await createGBCTicket(formData);

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to create ticket");
      }

      const { ticket, reference } = result.data;
      const amountInKobo = ticket.price * 100;
      const email = formData.get("email") as string;
      const name = formData.get("name") as string;

      if (!paystack) {
        throw new Error("Payment service is not available");
      }

      // Show loading state for payment initialization
      toast.loading("Initializing payment...");

      paystack.newTransaction({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "",
        email,
        amount: amountInKobo,
        reference,
        firstName: name.split(" ")[0],
        lastName: name.split(" ").slice(1).join(" ") || "Customer",
        onSuccess: async (transaction: any) => {
          toast.dismiss();
          toast.success("Payment successful! Verifying...");

          try {
            const verification = await verifyGBCPayment(reference);
            if (!verification.success) {
              throw new Error(
                verification.error || "Payment verification failed"
              );
            }
            toast.success("Payment verified successfully!");
            router.push(`/gbc2/tickets/success?reference=${reference}`);
          } catch (error) {
            console.error("Verification error:", error);
            const errorMessage =
              error instanceof Error
                ? error.message
                : "Payment verification failed";
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

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 bg-white p-8 rounded-xl shadow-lg"
    >
      <div className="grid md:grid-cols-2 gap-6">
        {/* Full Name */}
        <div>
          <Label htmlFor="name">Full Name *</Label>
          <Input
            id="name"
            name="name"
            type="text"
            required
            placeholder="John Doe"
            className="mt-1"
            disabled={isSubmitting}
          />
        </div>

        {/* Email */}
        <div>
          <Label htmlFor="email">Email Address *</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="john@example.com"
            className="mt-1"
            disabled={isSubmitting}
          />
        </div>
      </div>

      {/* Phone Number */}
      <div>
        <Label htmlFor="phone">Phone Number (Optional)</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          placeholder="e.g., 08012345678"
          className="mt-1"
          disabled={isSubmitting}
          maxLength={11}
          pattern="[0-9]{11}"
          title="Please enter a valid 11-digit phone number"
        />
        <p className="text-sm text-gray-500 mt-1">
          For SMS notifications and event updates (11 digits, no spaces or
          special characters)
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Gender */}
        <div>
          <Label htmlFor="gender">Gender *</Label>
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
          <Label htmlFor="profession">Profession *</Label>
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
              <SelectItem value="PROJECT_MANAGER">Project Manager</SelectItem>
              <SelectItem value="STUDENT">Student</SelectItem>
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
              <Label htmlFor="otherProfession">
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

      {/* Ticket Type */}
      <div>
        <Label htmlFor="ticketType">Ticket Type *</Label>
        <Select
          name="ticketType"
          required
          defaultValue="EARLY_BIRD"
          disabled={isSubmitting}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EARLY_BIRD">
              <div className="flex items-center justify-between w-full">
                <span>Early Bird</span>
                <span className="ml-4 font-bold">₦100,000</span>
              </div>
            </SelectItem>
            <SelectItem value="REGULAR">
              <div className="flex items-center justify-between w-full">
                <span>Regular</span>
                <span className="ml-4 font-bold">₦120,000</span>
              </div>
            </SelectItem>
            <SelectItem value="COMPANY">
              <div className="flex items-center justify-between w-full">
                <span>Company</span>
                <span className="ml-4 font-bold">₦250,000</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Terms and Conditions */}
      <div className="border-t pt-6">
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
            className="text-sm text-gray-600 cursor-pointer"
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
        className="w-full btn-glow relative"
        size="lg"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <ShoppingCart className="mr-2 h-5 w-5" />
            {!paystack ? "Loading Payment..." : "Proceed to Payment"}
          </>
        )}
      </Button>

      {(formError || paymentError) && (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
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
