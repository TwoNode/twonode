"use client";

import { useState } from "react";
import { DollarSign, Users, Calendar, Edit, Save, X } from "lucide-react";
import { updateGBCSettingsSection } from "../../actions/settings-actions";
import { toast } from "sonner";
import { GBCSettingsData } from "../../utils/settings";

interface TicketPricingDisplayProps {
  settings: GBCSettingsData | null;
}

type TicketPricing = {
  earlyBirdPrice: number;
  regularPrice: number;
  companyPrice: number;
  earlyBirdDeadline: string;
  maxCapacity: number;
};

export function TicketPricingDisplay({ settings }: TicketPricingDisplayProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pricing, setPricing] = useState<TicketPricing>({
    earlyBirdPrice: settings?.tickets.earlyBirdPrice ?? 100000,
    regularPrice: settings?.tickets.regularPrice ?? 120000,
    companyPrice: settings?.tickets.companyPrice ?? 250000,
    earlyBirdDeadline: settings?.tickets.earlyBirdDeadline ?? "2025-02-28",
    maxCapacity: settings?.tickets.maxCapacity ?? 150,
  });

  const handlePriceChange = (key: keyof TicketPricing, value: any) => {
    setPricing((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const result = await updateGBCSettingsSection("tickets", pricing);

      if (result.success) {
        toast.success("Ticket prices updated successfully");
        setIsEditing(false);
      } else {
        throw new Error(result.error || "Failed to update");
      }
    } catch (error) {
      toast.error("Failed to update ticket prices");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number | string) => {
    let parsedPrice: number = 0;

    if (typeof price === "string") {
      try {
        parsedPrice = parseFloat(price);
      } catch (error) {
        console.error("Failed to parse price string:", error);
        return price;
      }
    }
    if (price === null || price === undefined) {
      return "N/A";
    }

    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(parsedPrice);
  };

  const ticketTypes = [
    {
      name: "Early Bird",
      key: "earlyBirdPrice" as keyof TicketPricing,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
      description: "Available until early bird deadline",
    },
    {
      name: "Regular",
      key: "regularPrice" as keyof TicketPricing,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      description: "Standard ticket price",
    },
    {
      name: "Company",
      key: "companyPrice" as keyof TicketPricing,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      description: "For corporate attendees",
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Ticket Pricing</h2>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
          >
            <Edit className="h-4 w-4" />
            Edit Prices
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {ticketTypes.map((ticket) => {
          const Icon = ticket.icon;
          const price = pricing[ticket.key];

          return (
            <div
              key={ticket.key}
              className={`${ticket.bgColor} border border-gray-200 rounded-lg p-4`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${ticket.color}`} />
                  <h3 className="font-semibold">{ticket.name}</h3>
                </div>
                {isEditing ? (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      ₦
                    </span>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) =>
                        handlePriceChange(ticket.key, parseInt(e.target.value))
                      }
                      className="w-28 pl-6 pr-2 py-1 text-right border rounded bg-white/50"
                      min="0"
                      step="1000"
                    />
                  </div>
                ) : (
                  <p className={`text-2xl font-bold ${ticket.color}`}>
                    {formatPrice(price)}
                  </p>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">{ticket.description}</p>
            </div>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-5 w-5 text-purple-600" />
            <h3 className="font-medium">Early Bird Deadline</h3>
          </div>
          {isEditing ? (
            <div>
              <input
                type="date"
                value={pricing.earlyBirdDeadline}
                onChange={(e) =>
                  handlePriceChange("earlyBirdDeadline", e.target.value)
                }
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Early bird pricing ends on this date
              </p>
            </div>
          ) : (
            <>
              <p className="text-2xl font-bold text-purple-600">
                {new Date(pricing.earlyBirdDeadline).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Early bird pricing ends on this date
              </p>
            </>
          )}
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-purple-600" />
            <h3 className="font-medium">Maximum Capacity</h3>
          </div>
          {isEditing ? (
            <div>
              <input
                type="number"
                value={pricing.maxCapacity}
                onChange={(e) =>
                  handlePriceChange("maxCapacity", parseInt(e.target.value))
                }
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                min="1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Total available tickets for the event
              </p>
            </div>
          ) : (
            <>
              <p className="text-2xl font-bold text-purple-600">
                {pricing.maxCapacity} seats
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Total available tickets for the event
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
