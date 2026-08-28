"use client";

import { useState } from "react";
import {
  DollarSign,
  Users,
  Calendar,
  Edit,
  Save,
  X,
  AlertCircle,
  GraduationCap,
  Star,
} from "lucide-react";
import { updateGBCSettingsSection } from "@/app/(projects)/(GBC)/actions/settings-actions";
import { toast } from "sonner";
import { GBCSettingsData, defaultSettings } from "@/gbc/utils/settings";

interface TicketPricingDisplayProps {
  settings: GBCSettingsData | null;
}

export function TicketPricingDisplay({ settings }: TicketPricingDisplayProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pricing, setPricing] = useState<GBCSettingsData["tickets"]>({
    ...defaultSettings.tickets,
    ...(settings?.tickets || {}),
  });

  const handlePriceChange = (
    key: keyof GBCSettingsData["tickets"],
    value: any
  ) => {
    setPricing((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleInfoListChange = (
    key: keyof GBCSettingsData["tickets"],
    value: string
  ) => {
    const list = value.split("\n");
    setPricing((prev) => ({
      ...prev,
      [key]: list,
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
    if (price === null || price === undefined) {
      return "N/A";
    }

    let parsedPrice: number = 0;

    if (typeof price === "string") {
      try {
        parsedPrice = parseFloat(price);
      } catch (error) {
        console.error("Failed to parse price string:", error);
        return price;
      }
    } else {
      parsedPrice = price;
    }

    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(parsedPrice);
  };

  const ticketTypes = [
    {
      name: "Single Ticket (One Attendee)",
      key: "earlyBirdPrice" as keyof GBCSettingsData["tickets"],
      infoKey: "earlyBirdInfoList" as keyof GBCSettingsData["tickets"],
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
      description: "Available until single ticket deadline",
    },
    {
      name: "Pair Ticket (Two attendees)",
      key: "regularPrice" as keyof GBCSettingsData["tickets"],
      infoKey: "regularInfoList" as keyof GBCSettingsData["tickets"],
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      description: "Standard ticket price for 2",
    },
    {
      name: "Group Ticket (Five Attendees)",
      key: "companyPrice" as keyof GBCSettingsData["tickets"],
      infoKey: "companyInfoList" as keyof GBCSettingsData["tickets"],
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      description: "For corporate groups of 5",
    },
    {
      name: "Student Ticket (One Attendee)",
      key: "studentPrice" as keyof GBCSettingsData["tickets"],
      infoKey: "studentInfoList" as keyof GBCSettingsData["tickets"],
      icon: GraduationCap,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      description: "Valid student ID required",
    },
    {
      name: "VIP Ticket (One Attendee)",
      key: "vipPrice" as keyof GBCSettingsData["tickets"],
      infoKey: "vipInfoList" as keyof GBCSettingsData["tickets"],
      icon: Star,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      description: "Premium conference experience",
    },
  ];

  return (
    <div className="max-w-full">
      <div className="max-w-full flex justify-between items-center mb-6">
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

      <div className="max-w-full grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 mb-6">
        {ticketTypes.map((ticket) => {
          const Icon = ticket.icon;
          const price = pricing[ticket.key];
          const infoList = pricing[ticket.infoKey] as string[];

          return (
            <div
              key={ticket.key}
              className={`${ticket.bgColor} w-full max-w-full border border-gray-200 rounded-lg p-4`}
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
                      value={price as number}
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
                    {formatPrice(price as number)}
                  </p>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1 mb-3">
                {ticket.description}
              </p>

              {/* Info List Section */}
              <div className="mt-4 border-t border-gray-200/50 pt-3">
                <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2">
                  Includes:
                </h4>
                {isEditing ? (
                  <textarea
                    value={infoList.join("\n")}
                    onChange={(e) =>
                      handleInfoListChange(ticket.infoKey, e.target.value)
                    }
                    className="w-full text-sm p-2 border rounded bg-white/50 h-32 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    placeholder="Enter features (one per line)"
                  />
                ) : (
                  <ul className="text-sm space-y-1">
                    {infoList.length > 0 ? (
                      infoList.map((info, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-green-500 mt-0.5">✓</span>
                          <span className="text-gray-700">{info}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-gray-400 italic">
                        No features listed
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid md:grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4 mb-6">
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
            <h3 className="font-medium">Total Capacity</h3>
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

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-green-600" />
            <h3 className="font-medium">Early Bird Cap</h3>
          </div>
          {isEditing ? (
            <div>
              <input
                type="number"
                value={pricing.maxEarlyBirdCapacity}
                onChange={(e) =>
                  handlePriceChange(
                    "maxEarlyBirdCapacity",
                    parseInt(e.target.value)
                  )
                }
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                min="1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Max early bird tickets available
              </p>
            </div>
          ) : (
            <>
              <p className="text-2xl font-bold text-green-600">
                {pricing.maxEarlyBirdCapacity} seats
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Max early bird tickets available
              </p>
            </>
          )}
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-blue-600" />
            <h3 className="font-medium">Regular Cap</h3>
          </div>
          {isEditing ? (
            <div>
              <input
                type="number"
                value={pricing.maxRegularCapacity}
                onChange={(e) =>
                  handlePriceChange(
                    "maxRegularCapacity",
                    parseInt(e.target.value)
                  )
                }
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                min="1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Max regular tickets available
              </p>
            </div>
          ) : (
            <>
              <p className="text-2xl font-bold text-blue-600">
                {pricing.maxRegularCapacity} seats
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Max regular tickets available
              </p>
            </>
          )}
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-purple-600" />
            <h3 className="font-medium">Group Cap</h3>
          </div>
          {isEditing ? (
            <div>
              <input
                type="number"
                value={pricing.maxCompanyCapacity}
                onChange={(e) =>
                  handlePriceChange(
                    "maxCompanyCapacity",
                    parseInt(e.target.value)
                  )
                }
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                min="1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Max group tickets available
              </p>
            </div>
          ) : (
            <>
              <p className="text-2xl font-bold text-purple-600">
                {pricing.maxCompanyCapacity} seats
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Max group tickets available
              </p>
            </>
          )}
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <GraduationCap className="h-5 w-5 text-indigo-600" />
            <h3 className="font-medium">Student Cap</h3>
          </div>
          {isEditing ? (
            <div>
              <input
                type="number"
                value={pricing.maxStudentCapacity}
                onChange={(e) =>
                  handlePriceChange(
                    "maxStudentCapacity",
                    parseInt(e.target.value)
                  )
                }
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                min="1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Max student tickets available
              </p>
            </div>
          ) : (
            <>
              <p className="text-2xl font-bold text-indigo-600">
                {pricing.maxStudentCapacity} seats
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Max student tickets available
              </p>
            </>
          )}
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-5 w-5 text-amber-600" />
            <h3 className="font-medium">VIP Cap</h3>
          </div>
          {isEditing ? (
            <div>
              <input
                type="number"
                value={pricing.maxVipCapacity}
                onChange={(e) =>
                  handlePriceChange(
                    "maxVipCapacity",
                    parseInt(e.target.value)
                  )
                }
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                min="1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Max VIP tickets available
              </p>
            </div>
          ) : (
            <>
              <p className="text-2xl font-bold text-amber-600">
                {pricing.maxVipCapacity} seats
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Max VIP tickets available
              </p>
            </>
          )}
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <h3 className="font-medium">Pause Registration</h3>
          </div>
          {isEditing ? (
            <div className="flex items-center gap-3 mt-2">
              <div
                onClick={() =>
                  handlePriceChange("pauseTicketReg", !pricing.pauseTicketReg)
                }
                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out ${
                  pricing.pauseTicketReg ? "bg-red-500" : "bg-gray-300"
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                    pricing.pauseTicketReg ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </div>
              <span className="text-sm font-medium">
                {pricing.pauseTicketReg ? "Paused" : "Active"}
              </span>
            </div>
          ) : (
            <>
              <p
                className={`text-2xl font-bold ${
                  pricing.pauseTicketReg ? "text-red-600" : "text-green-600"
                }`}
              >
                {pricing.pauseTicketReg ? "Paused" : "Active"}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Status of ticket sales
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
