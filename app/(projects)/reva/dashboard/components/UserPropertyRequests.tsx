import { formatCurrency, formatDate } from "@/utils/formatters";
import {
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationCircleIcon,
  MapPinIcon,
  BanknotesIcon,
  BuildingOfficeIcon,
  HomeModernIcon,
  ShoppingBagIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

type PropertyStatus = "Available" | "Completed" | "Processing";

type PaymentStatus = "Paid" | "Unpaid";

interface Property {
  id: string;
  reference: string;
  title: string | null;
  description: string | null;
  status: PropertyStatus | null;
  paymentStatus: PaymentStatus | null;
  statusMessage?: string | null;
  error?: string | null;
  userId?: string;
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
  paymentLink?: string | null;
  report?: any;
  isOneTimeRequest?: boolean;
}

interface PropertyRequestsProps {
  data?: Property[];
  title?: string;
  smallTitle?: boolean;
}

const getPropertyIcon = (propertyType?: string) => {
  switch (propertyType?.toLowerCase()) {
    case "commercial":
      return <ShoppingBagIcon className="h-6 w-6 text-blue-500" />;
    case "apartment":
      return <BuildingOfficeIcon className="h-6 w-6 text-purple-500" />;
    default:
      return <HomeModernIcon className="h-6 w-6 text-green-500" />;
  }
};

export default function UserPropertyRequests({
  data,
  title,
  smallTitle,
}: PropertyRequestsProps | any) {
  const defaultProperties: Property[] = [];

  const properties = data?.length ? data : defaultProperties;

  const getStatusColor = (status: PropertyStatus) => {
    switch (status) {
      case "Available":
        return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
      case "Completed":
        return "bg-blue-50 text-blue-700 ring-blue-600/20";
      case "Processing":
        return "bg-amber-50 text-amber-700 ring-amber-600/20";
      default:
        return "bg-gray-50 text-gray-700 ring-gray-600/20";
    }
  };

  const getPaymentStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case "Paid":
        return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
      case "Unpaid":
        return "bg-red-50 text-red-700 ring-red-600/20";
      default:
        return "bg-gray-50 text-gray-700 ring-gray-600/20";
    }
  };

  const getStatusIcon = (status: PropertyStatus) => {
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

  const getPaymentStatusIcon = (status: PaymentStatus) => {
    switch (status) {
      case "Paid":
        return <BanknotesIcon className="h-4 w-4" />;
      case "Unpaid":
        return <ExclamationCircleIcon className="h-4 w-4" />;
      default:
        return <ExclamationCircleIcon className="h-4 w-4" />;
    }
  };

  const getPropertyType = (name: string | null) => {
    if (!name) return "Unknown";
    if (name.toLowerCase().includes("apartment")) return "Apartment";
    if (
      name.toLowerCase().includes("commercial") ||
      name.toLowerCase().includes("plaza")
    )
      return "Commercial";
    return "Residential";
  };

  const isReportReady = (property: Property) => {
    return (
      property?.report &&
      typeof property.report === "object" &&
      "isApproved" in property.report &&
      property.report?.isApproved === true
    );
  };

  const getRequestType = (property: Property) => {
    return property?.isOneTimeRequest || property?.requester || property?.email
      ? "OneTime"
      : "Regular";
  };

  const getViewLink = (property: Property) => {
    if (property?.isOneTimeRequest || property?.requester || property?.email) {
      return `/reva/onetimerequest?reference=${
        property.reference
      }&email=${encodeURIComponent(property.email || "")}`;
    }
    return `/reva/dashboard/details?reference=${property.reference}`;
  };

  const getRequesterInfo = (property: Property) => {
    if (property?.isOneTimeRequest || property?.requester || property?.email) {
      return {
        name: property.requester || "OneTime User",
        email: property.email,
        phone: property.userPhoneNumber,
        type: "OneTime",
      };
    }
    return {
      name: property.user
        ? `${property.user.firstName} ${property.user.lastName}`
        : "Unknown User",
      email: property.user?.email,
      phone: null,
      type: "Regular",
    };
  };

  if (properties.length === 0) {
    return (
      <div className="min-h-[400px] bg-linear-to-b from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-24 w-24 text-gray-300 mb-4">
            <DocumentTextIcon className="h-full w-full" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No requests found
          </h3>
          <p className="text-gray-500">
            You haven't submitted any property requests yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${
        smallTitle ? "" : "min-h-screen"
      } bg-linear-to-b from-gray-50 to-gray-100`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1
                className={`${
                  smallTitle ? "text-2xl" : "text-3xl sm:text-4xl"
                } font-bold text-gray-900 mb-2`}
              >
                {title ?? "Property Requests"}
              </h1>
              <p className="text-gray-600">
                Showing {properties.length}{" "}
                {properties.length === 1 ? "request" : "requests"}
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                {
                  properties.filter(
                    (p: Property) => !p.isOneTimeRequest && !p.requester
                  ).length
                }{" "}
                Regular
              </Badge>
              <Badge variant="outline" className="bg-purple-50 text-purple-700">
                {
                  properties.filter(
                    (p: Property) => p.isOneTimeRequest || p.requester
                  ).length
                }{" "}
                OneTime
              </Badge>
            </div>
          </div>
        </div>

        {/* Property Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {properties.map((property: Property) => {
            const propertyType = getPropertyType(property.title);
            const requesterInfo = getRequesterInfo(property);
            const requestType = getRequestType(property);
            const reportReady = isReportReady(property);

            return (
              <Card
                key={property.id}
                className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg"
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
                          {property.title ||
                            property.description ||
                            "Untitled Request"}
                        </h3>
                        <p className="text-sm text-gray-500">
                          REF: {property.reference}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Status Badges */}
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      className={`${getStatusColor(
                        property.status ?? "Processing"
                      )}`}
                    >
                      {getStatusIcon(property.status ?? "Processing")}
                      {property.status}
                    </Badge>
                    <Badge
                      className={`${getPaymentStatusColor(
                        property.paymentStatus ?? "Unpaid"
                      )}`}
                    >
                      {getPaymentStatusIcon(property.paymentStatus!)}
                      {property.paymentStatus}
                    </Badge>
                  </div>

                  {/* Requester Information */}
                  {requestType === "OneTime" && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <UserIcon className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">
                          Requester
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">
                            {requesterInfo.name}
                          </span>
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
                  )}

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
                            {property.address}
                          </p>
                          {property.lga && (
                            <p className="text-xs text-gray-500">
                              {property.lga}
                            </p>
                          )}
                        </div>
                      </div>

                      {property.parcelId && (
                        <div className="flex items-center gap-2">
                          <DocumentTextIcon className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Parcel ID
                            </p>
                            <p className="text-sm text-gray-900">
                              {property.parcelId}
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
                            {formatCurrency(property.totalCost)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {property.updatedAt ? "Last Updated" : "Created"}
                          </p>
                          <p className="text-sm text-gray-900">
                            {formatDate(
                              property?.updatedAt
                                ? new Date(property.updatedAt)
                                : property?.createdAt
                                ? new Date(property.createdAt)
                                : undefined
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Documents Section */}
                  {property.documentsUrls.length > 0 && (
                    <div className="border-t pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <DocumentTextIcon className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">
                          Supporting Documents
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {property.documentsUrls.length}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {property.documentsUrls
                          .slice(0, 4)
                          .map((doc: string, index: number) => (
                            <a
                              key={index}
                              href={doc}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                            >
                              <ArrowDownTrayIcon className="h-3 w-3" />
                              <span className="truncate">
                                {doc
                                  .split("/")
                                  .pop()
                                  ?.replace(/_/g, " ")
                                  .replace(".pdf", "") ||
                                  `Document ${index + 1}`}
                              </span>
                            </a>
                          ))}
                        {property.documentsUrls.length > 4 && (
                          <div className="text-xs text-gray-500 col-span-full">
                            +{property.documentsUrls.length - 4} more documents
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t">
                    <Button asChild className="flex-1">
                      <Link href={getViewLink(property)}>
                        <EyeIcon className="h-4 w-4 mr-2" />
                        View Details
                      </Link>
                    </Button>

                    {reportReady && (
                      <Button variant="outline" asChild>
                        <Link
                          href={`/api/reva/onetimerequest/download?reference=${
                            property.reference
                          }&email=${encodeURIComponent(property.email || "")}`}
                        >
                          <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                          Download Report
                        </Link>
                      </Button>
                    )}
                  </div>

                  {/* Status Message */}
                  {property.statusMessage && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        {property.statusMessage}
                      </p>
                    </div>
                  )}

                  {/* Error Message */}
                  {property.error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-800">{property.error}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
