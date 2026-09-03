import React from "react";
import Welcome from "./components/Welcome";
import Link from "next/link";
import { getAllRequestsWithUserByAdmin } from "@/reva/services/reportService";
import ErrorComponent from "../../reva/dashboard/components/ErrorComponent";
import { REVA_COLORS, REVA_GRADIENTS, revaStatusBadgeStyle } from "@/reva/colors";

const Home = async () => {
  let data, oneTimeRequests;
  try {
    ({ properties: data, oneTimeRequests } = await getAllRequestsWithUserByAdmin({
      limit: 5,
      includeOneTimeRequests: true,
    }));
  } catch {
    return <ErrorComponent />;
  }

  return (
    <div className="flex flex-col p-[47px_60px] max-xl:p-[30px_40px] max-lg:p-[15px_30px] max-sm:p-[10px_15px] max-md:p-[10px_20px] max-w-full">
      <Welcome />

      <div className="propertiesSection mt-8 sm:mt-12 max-w-[95%] mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row flex-wrap justify-between items-start sm:items-center gap-6 sm:gap-6 lg:gap-0 mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Recent Property Requests
          </h2>

          <Link
            href="/reva-restricted/dashboard/alluserrequests"
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 sm:px-6 py-2 sm:py-2.5 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
            style={{ background: REVA_GRADIENTS.primary }}
          >
            <span>View All Properties</span>
            <svg
              className="w-4 h-4 ml-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>

        <ul className="grid grid-cols-1 xl:grid-cols-3 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {data?.map((property) => (
            <li
              key={property.id}
              className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden"
            >
              <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-4">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 line-clamp-1">
                    {property?.title || "Untitled Property"}
                  </h3>
                  <div className="flex gap-2 flex-wrap">
                    <span
                      className="self-start sm:self-center px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap"
                      style={revaStatusBadgeStyle(
                        property.status === "Available"
                          ? "success"
                          : property.status === "Processing"
                          ? "warning"
                          : "info"
                      )}
                    >
                      {property.status}
                    </span>
                    <span
                      className="self-start sm:self-center px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap"
                      style={revaStatusBadgeStyle(
                        property.paymentStatus === "Paid" ? "success" : "error"
                      )}
                    >
                      {property.paymentStatus}
                    </span>
                    <span
                      className="self-start sm:self-center px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap"
                      style={revaStatusBadgeStyle(
                        property?.report &&
                          typeof property?.report === "object" &&
                          "isApproved" in property?.report &&
                          property.report.isApproved
                          ? "success"
                          : "error"
                      )}
                    >
                      {property?.report &&
                      typeof property?.report === "object" &&
                      "isApproved" in property?.report &&
                      property.report.isApproved
                        ? "Approved"
                        : "Not Approved"}
                    </span>
                  </div>
                </div>

                <p className="text-sm sm:text-base text-gray-600 mb-4 line-clamp-2">
                  {property.description || "No description available"}
                </p>

                <div className="flex flex-col gap-3 mb-4">
                  <div className="flex items-center text-gray-600">
                    <svg
                      className="w-5 h-5 text-gray-400 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span className="text-sm">{property.address}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <svg
                      className="w-5 h-5 text-gray-400 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="text-sm">
                      Created:{" "}
                      {new Date(property.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4 border-t border-gray-100">
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 text-gray-400 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span
                      className="font-semibold"
                      style={{ color: REVA_COLORS.text.primary }}
                    >
                      ₦{property.totalCost.toLocaleString()}
                    </span>
                  </div>
                  <Link
                    href={`/reva-restricted/dashboard/details?reference=${property.reference}`}
                    className="text-sm font-medium group flex items-center"
                    style={{ color: REVA_COLORS.primary.light }}
                  >
                    View Details
                    <span className="inline-block transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </Link>
                </div>
              </div>
            </li>
          ))}

          {oneTimeRequests?.map((property) => (
            <li
              key={property.id}
              className="rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border overflow-hidden bg-white"
              style={{ borderTopWidth: 2, borderTopColor: REVA_COLORS.secondary.light }}
            >
              <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-4">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 line-clamp-1">
                    {property?.description || "Untitled Property"}
                  </h3>
                  <div className="flex gap-2 flex-wrap">
                    <span
                      className="self-start sm:self-center px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap"
                      style={revaStatusBadgeStyle(
                        property.status === "Completed" ||
                          property.status === "Available"
                          ? "success"
                          : property.status === "Processing"
                          ? "warning"
                          : "info"
                      )}
                    >
                      {property.status}
                    </span>
                    <span
                      className="self-start sm:self-center px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap"
                      style={revaStatusBadgeStyle(
                        property.paymentStatus === "Paid" ? "success" : "error"
                      )}
                    >
                      {property.paymentStatus}
                    </span>
                    <span
                      className="self-start sm:self-center px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap"
                      style={revaStatusBadgeStyle(
                        property?.report &&
                          typeof property?.report === "object" &&
                          "isApproved" in property?.report &&
                          property.report.isApproved
                          ? "success"
                          : "error"
                      )}
                    >
                      {property?.report &&
                      typeof property?.report === "object" &&
                      "isApproved" in property?.report &&
                      property.report.isApproved
                        ? "Approved"
                        : "Not Approved"}
                    </span>
                  </div>
                </div>

                <p className="text-sm sm:text-base text-gray-600 mb-4 line-clamp-2">
                  {property.description || "No description available"}
                </p>

                <div className="flex flex-col gap-3 mb-4">
                  <div className="flex items-center text-gray-600">
                    <svg
                      className="w-5 h-5 text-gray-400 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span className="text-sm">{property.address}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <svg
                      className="w-5 h-5 text-gray-400 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="text-sm">
                      Created:{" "}
                      {new Date(property.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4 border-t border-gray-100">
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 text-gray-400 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span
                      className="font-semibold"
                      style={{ color: REVA_COLORS.text.primary }}
                    >
                      ₦{property.totalCost.toLocaleString()}
                    </span>
                  </div>
                  <Link
                    href={`/reva-restricted/dashboard/details?reference=${property.reference}`}
                    className="text-sm font-medium group flex items-center"
                    style={{ color: REVA_COLORS.primary.light }}
                  >
                    View Details
                    <span className="inline-block transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Home;
