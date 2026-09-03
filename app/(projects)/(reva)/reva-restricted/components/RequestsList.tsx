"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { format, addDays } from "date-fns";
import {
  MapPinIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  DocumentTextIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  BanknotesIcon,
  BuildingOfficeIcon,
  HomeModernIcon,
  ShoppingBagIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";

// Custom Naira icon component
const NairaIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M7 6V4H9V6H11V4H13V6H15V8H13V16H15V18H13V20H11V18H9V20H7V18H5V16H7V8H5V6H7ZM9 8V16H11V8H9Z" />
  </svg>
);

interface Request {
  id: string;
  reference: string;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  paymentStatus?: string | null;
  statusMessage?: string | null;
  error?: string | null;
  deleted?: boolean;

  // OneTime request fields
  requester?: string | null;
  email?: string;
  userPhoneNumber?: string | null;

  // Regular request fields
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };

  address: string;
  lat?: number | null;
  lng?: number | null;
  lga: string;
  parcelId?: string | null;
  totalCost: number;
  documentsUrls: string[];
  comments?: string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  report?: any;
  isOneTimeRequest?: boolean;
}

interface RequestListProps {
  requests: Request[];
  title?: string;
  showStats?: boolean;
}

const RequestList = ({
  requests,
  title,
  showStats = true,
}: RequestListProps) => {
  const getPropertyIcon = (propertyType?: string) => {
    switch (propertyType?.toLowerCase()) {
      case "commercial":
        return <ShoppingBagIcon className="h-5 w-5 text-blue-500" />;
      case "apartment":
        return <BuildingOfficeIcon className="h-5 w-5 text-purple-500" />;
      default:
        return <HomeModernIcon className="h-5 w-5 text-green-500" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "Available":
      case "Completed":
        return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
      case "Processing":
        return "bg-amber-50 text-amber-700 ring-amber-600/20";
      default:
        return "bg-gray-50 text-gray-700 ring-gray-600/20";
    }
  };

  const getPaymentStatusColor = (status?: string) => {
    switch (status) {
      case "Paid":
        return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
      case "Unpaid":
        return "bg-red-50 text-red-700 ring-red-600/20";
      default:
        return "bg-gray-50 text-gray-700 ring-gray-600/20";
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "Available":
      case "Completed":
        return <CheckCircleIcon className="h-4 w-4" />;
      case "Processing":
        return <ClockIcon className="h-4 w-4" />;
      default:
        return <ExclamationCircleIcon className="h-4 w-4" />;
    }
  };

  const getPaymentStatusIcon = (status?: string) => {
    switch (status) {
      case "Paid":
        return <BanknotesIcon className="h-4 w-4" />;
      case "Unpaid":
        return <ExclamationCircleIcon className="h-4 w-4" />;
      default:
        return <ExclamationCircleIcon className="h-4 w-4" />;
    }
  };

  const getPropertyType = (name?: string | null) => {
    if (!name) return "Unknown";
    if (name.toLowerCase().includes("apartment")) return "Apartment";
    if (
      name.toLowerCase().includes("commercial") ||
      name.toLowerCase().includes("plaza")
    )
      return "Commercial";
    return "Residential";
  };

  const getRequestType = (request: Request) => {
    return request?.isOneTimeRequest || request?.requester || request?.email
      ? "OneTime"
      : "Regular";
  };

  const getRequesterInfo = (request: Request) => {
    if (request?.isOneTimeRequest || request?.requester || request?.email) {
      return {
        name: request.requester || "OneTime User",
        email: request.email,
        phone: request.userPhoneNumber,
        type: "OneTime",
      };
    }
    return {
      name: request.user
        ? `${request.user.firstName} ${request.user.lastName}`
        : "Unknown User",
      email: request.user?.email,
      phone: null,
      type: "Regular",
    };
  };

  const isReportReady = (request: Request) => {
    return (
      request?.report &&
      typeof request.report === "object" &&
      "isApproved" in request.report &&
      request.report?.isApproved === true
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getDateForFormatting = (request: Request) => {
    const dateString = request.updatedAt || request.createdAt;
    return dateString ? new Date(dateString) : new Date();
  };

  if (requests.length === 0) {
    return (
      <div className="min-h-[400px] bg-linear-to-b from-gray-50 to-gray-100 flex items-center justify-center rounded-lg">
        <div className="text-center">
          <div className="mx-auto h-24 w-24 text-gray-300 mb-4">
            <DocumentTextIcon className="h-full w-full" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No requests found
          </h3>
          <p className="text-gray-500">
            No property requests match your criteria.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      {showStats && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {title || "Property Requests"}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Showing {requests.length}{" "}
                {requests.length === 1 ? "request" : "requests"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                {
                  requests.filter((r) => !r.isOneTimeRequest && !r.requester)
                    .length
                }{" "}
                Regular
              </Badge>
              <Badge variant="outline" className="bg-purple-50 text-purple-700">
                {
                  requests.filter((r) => r.isOneTimeRequest || r.requester)
                    .length
                }{" "}
                OneTime
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* Requests Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {requests.map((request) => {
          const propertyType = getPropertyType(request.title);
          const requesterInfo = getRequesterInfo(request);
          const requestType = getRequestType(request);
          const reportReady = isReportReady(request);

          return (
            <Card
              key={request.id}
              className={`group hover:shadow-xl transition-all duration-300 border-0 shadow-lg ${
                request?.deleted ? "bg-red-50 border-red-200" : ""
              }`}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      {getPropertyIcon(propertyType)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="outline"
                          className={
                            requestType === "OneTime"
                              ? "bg-purple-50 text-purple-700"
                              : "bg-blue-50 text-blue-700"
                          }
                        >
                          {requestType}
                        </Badge>
                        {reportReady && (
                          <Badge className="bg-green-50 text-green-700">
                            <CheckCircleIcon className="h-3 w-3 mr-1" />
                            Approved
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {request.title ||
                          request.description ||
                          "Untitled Request"}
                      </h3>
                      <p className="text-sm text-gray-500">
                        REF: {request.reference}
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Status Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge className={getStatusColor(request.status || undefined)}>
                    {getStatusIcon(request.status || undefined)}
                    {request.status}
                  </Badge>
                  <Badge
                    className={getPaymentStatusColor(request.paymentStatus || undefined)}
                  >
                    {getPaymentStatusIcon(request.paymentStatus || undefined)}
                    {request.paymentStatus}
                  </Badge>
                </div>

                {/* Requester Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <UserIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">
                      Requester
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{requesterInfo.name}</span>
                    </div>
                    {requesterInfo.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <EnvelopeIcon className="h-4 w-4" />
                        <span>{requesterInfo.email}</span>
                      </div>
                    )}
                    {requesterInfo.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <PhoneIcon className="h-4 w-4" />
                        <span>{requesterInfo.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Property Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <MapPinIcon className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Address
                        </p>
                        <p className="text-sm text-gray-900">
                          {request.address}
                        </p>
                        {request.lga && (
                          <p className="text-xs text-gray-500">{request.lga}</p>
                        )}
                      </div>
                    </div>

                    {/* Coordinates */}
                    {(request.lat || request.lng) && (
                      <div className="flex items-center gap-2">
                        <GlobeAltIcon className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Coordinates
                          </p>
                          <p className="text-sm text-gray-900">
                            {request.lat && request.lng
                              ? `${request.lat.toFixed(
                                  6
                                )}, ${request.lng.toFixed(6)}`
                              : request.lat
                              ? `Lat: ${request.lat.toFixed(6)}`
                              : `Lng: ${request.lng?.toFixed(6)}`}
                          </p>
                        </div>
                      </div>
                    )}

                    {request.parcelId && (
                      <div className="flex items-center gap-2">
                        <DocumentTextIcon className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Parcel ID
                          </p>
                          <p className="text-sm text-gray-900">
                            {request.parcelId}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <NairaIcon className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Cost
                        </p>
                        <p className="text-lg font-bold text-blue-600">
                          {formatCurrency(request.totalCost)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {request.updatedAt ? "Last Updated" : "Created"}
                        </p>
                        <p className="text-sm text-gray-900">
                          {format(
                            getDateForFormatting(request),
                            "dd MMM yyyy, hh:mm a"
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <ClockIcon className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Due Date
                        </p>
                        <p
                          className={`text-sm ${
                            new Date() >
                            addDays(getDateForFormatting(request), 1)
                              ? "text-red-600"
                              : "text-gray-900"
                          }`}
                        >
                          {format(
                            addDays(getDateForFormatting(request), 1),
                            "dd MMM yyyy, hh:mm a"
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Documents Section */}
                {request.documentsUrls.length > 0 && (
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <DocumentTextIcon className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">
                        Supporting Documents
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {request.documentsUrls.length}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {request.documentsUrls
                        .slice(0, 4)
                        .map((url: string, index: number) => (
                          <a
                            key={index}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                          >
                            <ArrowDownTrayIcon className="h-3 w-3" />
                            <span className="truncate">
                              {url
                                .split("/")
                                .pop()
                                ?.replace(/_/g, " ")
                                .replace(".pdf", "") || `Document ${index + 1}`}
                            </span>
                          </a>
                        ))}
                      {request.documentsUrls.length > 4 && (
                        <div className="text-xs text-gray-500 col-span-full">
                          +{request.documentsUrls.length - 4} more documents
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Report Status */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {request.report ? (
                        request.report?.isApproved ? (
                          <Badge className="bg-green-50 text-green-700">
                            <CheckCircleIcon className="h-3 w-3 mr-1" />
                            Report Approved
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-50 text-yellow-700">
                            <ClockIcon className="h-3 w-3 mr-1" />
                            Report Under Review
                          </Badge>
                        )
                      ) : (
                        <Badge className="bg-red-50 text-red-700">
                          <ExclamationCircleIcon className="h-3 w-3 mr-1" />
                          No Report
                        </Badge>
                      )}
                    </div>

                    <Button asChild size="sm" variant="secondary">
                      <Link
                        href={`/reva-restricted/dashboard/details?reference=${request.reference}`}
                      >
                        <EyeIcon className="h-4 w-4 mr-2" />
                        View Details
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* Status Messages */}
                {request.statusMessage && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      {request.statusMessage}
                    </p>
                  </div>
                )}

                {/* Error Messages */}
                {request.error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-800">{request.error}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default RequestList;
