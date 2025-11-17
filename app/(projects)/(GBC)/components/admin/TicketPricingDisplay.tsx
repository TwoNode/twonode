"use client";

import { useState, useEffect } from "react";
import {
  DollarSign,
  Users,
  Calendar,
  AlertCircle,
  Edit,
  Save,
  X,
} from "lucide-react";
import { updateGBCSetting } from "../../actions/settings-actions";
import { toast } from "sonner";

interface TicketPricingDisplayProps {
  settings?: Array<{
    id: string;
    key: string;
    value: string;
    description?: string | null;
  }>;
}

export function TicketPricingDisplay({
  settings = [],
}: TicketPricingDisplayProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pricing, setPricing] = useState<Record<string, string>>({});

  useEffect(() => {
    if (settings) {
      const initialPricing = settings.reduce((acc, setting) => {
        if (setting.key.startsWith("ticket_")) {
          acc[setting.key] = setting.value;
        }
        return acc;
      }, {} as Record<string, string>);
      setPricing(initialPricing);
    }
  }, [settings]);

  const handlePriceChange = (key: string, value: string) => {
    setPricing((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const updates = Object.entries(pricing).map(([key, value]) =>
        updateGBCSetting(key, value)
      );

      const results = await Promise.all(updates);

      if (results.every((r) => r.success)) {
        toast.success("Ticket prices updated successfully");
        setIsEditing(false);
      } else {
        throw new Error("Some prices failed to update");
      }
    } catch (error) {
      toast.error("Failed to update ticket prices");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(parseInt(price || "0"));
  };

  const ticketTypes = [
    {
      name: "Early Bird",
      key: "ticket_early_bird_price",
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
      description: "Available until early bird deadline",
    },
    {
      name: "Regular",
      key: "ticket_regular_price",
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      description: "Standard ticket price",
    },
    {
      name: "Company",
      key: "ticket_company_price",
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
          const price = pricing[ticket.key] || "0";

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
                        handlePriceChange(ticket.key, e.target.value)
                      }
                      className="w-24 pl-6 pr-2 py-1 text-right border rounded bg-white/50"
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
                value={pricing["ticket_early_bird_deadline"] || ""}
                onChange={(e) =>
                  handlePriceChange(
                    "ticket_early_bird_deadline",
                    e.target.value
                  )
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
                {new Date(
                  pricing["ticket_early_bird_deadline"] || ""
                ).toLocaleDateString() || "Not set"}
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
              <div className="relative">
                <input
                  type="number"
                  value={pricing["ticket_max_capacity"] || ""}
                  onChange={(e) =>
                    handlePriceChange("ticket_max_capacity", e.target.value)
                  }
                  className="w-full px-3 py-2 pl-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  min="1"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  Seats
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Total available tickets for the event
              </p>
            </div>
          ) : (
            <>
              <p className="text-2xl font-bold text-purple-600">
                {pricing["ticket_max_capacity"] || "0"} seats
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Total available tickets for the event
              </p>
            </>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 text-sm text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );
}
