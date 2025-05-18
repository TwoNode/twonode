import { formatCurrency, formatDate } from "@/utils/formatters";
import {
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  MapPinIcon,
  BanknotesIcon,
  BuildingOfficeIcon,
  HomeModernIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";

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
  userId: string;
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
}

interface PropertyRequestsProps {
  data?: Property[];
  title?: string;
  smallTitle?: boolean;
}

const getPropertyIcon = (propertyType?: string) => {
  switch (propertyType?.toLowerCase()) {
    case "commercial":
      return <ShoppingBagIcon className="h-5 w-5 text-gray-400" />;
    case "apartment":
      return <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />;
    default:
      return <HomeModernIcon className="h-5 w-5 text-gray-400" />;
  }
};

export default function UserPropertyRequests({
  data,
  title,
  smallTitle,
}: PropertyRequestsProps | any) {
  const defaultProperties: Property[] = [
    {
      id: "1",
      reference: "REF12345",
      title: "Luxury Apartment",
      description: "A beautiful luxury apartment in the city center.",
      status: "Available",
      paymentStatus: "Paid",
      userId: "user1",
      address: "123 Main Street, Lagos",
      lga: "Ikeja",
      totalCost: 50000,
      documentsUrls: ["document1.pdf", "document2.pdf"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      parcelId: "89AF9FSD98SA",
    },
    {
      id: "3",
      reference: "REF11223",
      title: "Residential Home",
      description: "A cozy residential home in a quiet neighborhood.",
      status: "Processing",
      paymentStatus: "Unpaid",
      userId: "user3",
      address: "789 Suburb Lane, Port Harcourt",
      lga: "Obio-Akpor",
      totalCost: 30000,
      documentsUrls: [],
      createdAt: new Date().toISOString(),
      updatedAt: null,
    },
  ];

  const properties = data?.length ? data : defaultProperties;

  const getStatusColor = (status: PropertyStatus) => {
    switch (status) {
      case "Available":
        return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
      case "Completed":
        return "bg-blue-50 text-blue-700 ring-blue-600/20";
      case "Processing":
        return "bg-red-50 text-red-700 ring-red-600/20";
      default:
        return "bg-amber-50 text-amber-700 ring-amber-600/20";
    }
  };

  const getPaymentStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case "Paid":
        return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
      case "Unpaid":
        return "bg-red-50 text-red-700 ring-red-600/20";
      default:
        return "bg-rose-50 text-rose-700 ring-rose-600/20";
    }
  };

  const getStatusIcon = (status: PropertyStatus) => {
    switch (status) {
      case "Available":
      case "Completed":
        return <CheckCircleIcon className="h-4 w-4" />;
      case "Processing":
        return <ExclamationCircleIcon className="h-4 w-4" />;
      default:
        return <ClockIcon className="h-4 w-4" />;
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

  return (
    <div
      className={`${
        smallTitle ? "" : "min-h-screen"
      } bg-gradient-to-b from-gray-50 to-gray-100`}
    >
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1
            className={
              smallTitle
                ? "text-2xl font-bold mb-4"
                : "text-2xl sm:text-3xl font-bold text-gray-900"
            }
          >
            {title ?? "Property Requests"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Showing {properties.length}{" "}
            {properties.length === 1 ? "property" : "properties"}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5">
          {properties.map((property: Property) => {
            const propertyType: string = getPropertyType(property.title);

            return (
              <div
                key={property.id}
                className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden transition-all hover:shadow-md hover:ring-gray-900/10"
              >
                <div className="p-5 sm:p-6">
                  {/* Header with title and status badges */}
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        {getPropertyIcon(propertyType)}
                        <div>
                          <Link
                            href={`/reva/dashboard/viewdetails?reference=${property.reference}`}
                            className="group"
                          >
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 leading-tight group-hover:text-indigo-600">
                              {property.title ||
                                property.description ||
                                "Untitled Property"}
                            </h2>
                            <p className="text-xs text-gray-400 mt-1">
                              REF: {property.reference} • {propertyType}
                            </p>
                          </Link>
                        </div>
                      </div>

                      {property.description && (
                        <p className="text-sm text-gray-500 mt-2">
                          {property.description}
                        </p>
                      )}
                    </div>

                    <div className="flex md:flex-col md:justify-start justify-end items-end gap-2">
                      <span
                        className={`inline-flex items-center gap-x-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${getStatusColor(
                          property.status ?? "Processing"
                        )}`}
                      >
                        {getStatusIcon(property.status ?? "Processing")}
                        {property.status}
                      </span>

                      <span
                        className={`inline-flex items-center gap-x-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${getPaymentStatusColor(
                          property.paymentStatus ?? "Unpaid"
                        )}`}
                      >
                        {getPaymentStatusIcon(property.paymentStatus!)}
                        {property.paymentStatus}
                      </span>
                    </div>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <MapPinIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Address
                        </h3>
                        <p className="text-gray-800">{property.address}</p>
                        {property.lga && (
                          <p className="text-xs text-gray-500 mt-1">
                            {property.lga}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <CurrencyDollarIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Cost
                        </h3>
                        <p className="text-2xl font-bold text-indigo-600">
                          {formatCurrency(property.totalCost)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <ClockIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {property.updatedAt ? "Last Updated" : "Created"}
                        </h3>
                        <p className="text-gray-800">
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

                  {/* Documents section */}
                  <div className="mt-5 pt-4 border-t border-gray-100">
                    <div className="flex justify-between items-center mb-3 max-sm:items-start max-sm:gap-6 max-sm:flex-col-reverse">
                      <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-2">
                        <DocumentTextIcon className="h-4 w-4" />
                        Supporting Documents
                      </h3>

                      {property.parcelId && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          Parcel ID: {property.parcelId}
                        </span>
                      )}
                    </div>

                    {property.documentsUrls.length > 0 ? (
                      <ul className="space-y-2">
                        {property.documentsUrls.map(
                          (doc: string, index: number) => (
                            <li key={index}>
                              <a
                                href="#"
                                className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-2 group"
                              >
                                <span className="truncate group-hover:underline">
                                  {doc.replace(/_/g, " ").replace(".pdf", "")}
                                </span>
                                <span className="text-xs text-gray-400 group-hover:text-gray-500">
                                  PDF
                                </span>
                              </a>
                            </li>
                          )
                        )}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-400 italic">
                        No documents uploaded
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
