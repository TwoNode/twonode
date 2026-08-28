"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ticket, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Ticket number + email is the guest-auth here — GBCTicket has no relation
 * to GBCUser, so this was never really a login. Submitting navigates to
 * this same route with both values as query params (matching REVA's
 * onetimerequest/page.tsx precedent), which also doubles as the link a
 * confirmation email could point to directly.
 */
export default function TicketLookupForm({ notFound }: { notFound?: boolean }) {
  const router = useRouter();
  const [ticketNumber, setTicketNumber] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    router.push(`/gbc/login?ticketNumber=${encodeURIComponent(ticketNumber.trim())}&email=${encodeURIComponent(email.trim())}`);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-purple-50 to-pink-50 px-4 py-12">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full shadow-lg border-4 border-purple-100 bg-linear-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Ticket className="w-10 h-10 text-white" />
          </div>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-purple-900 mb-2 text-center">My Ticket</h1>
        <p className="text-gray-600 mb-8 text-center text-sm">
          Look up your GBC ticket with your ticket number and the email you registered with
        </p>

        {notFound && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            We couldn&apos;t find that ticket. Double-check your ticket number and email, or check your confirmation
            email for the exact ticket number.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="ticketNumber">Ticket Number</Label>
            <Input
              id="ticketNumber"
              placeholder="GBC2_XXXXXX"
              value={ticketNumber}
              onChange={(e) => setTicketNumber(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button
            type="submit"
            disabled={submitting}
            className="w-full px-6 py-3 bg-linear-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition text-lg shadow-lg h-auto"
          >
            <Search className="mr-2 h-4 w-4" />
            {submitting ? "Looking up..." : "Find My Ticket"}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            Don&apos;t have a ticket yet?{" "}
            <a href="/gbc/tickets" className="text-purple-600 hover:underline font-medium">
              Get one here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
