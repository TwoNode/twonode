import React from "react";
import Welcome from "./components/Welcome";
import Link from "next/link";
import { getAllRequestsWithUserByAdmin } from "../actions/adminDbActions";
import ErrorComponent from "../../reva/dashboard/components/ErrorComponent";

const Home = async () => {
  const { data, success, oneTimeRequests } =
    await getAllRequestsWithUserByAdmin({
      limit: 5,
      includeOneTimeRequests: true,
    });

  if (!success) {
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
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg"
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
                      className={`self-start sm:self-center px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                        property.status === "Available"
                          ? "bg-green-100 text-green-800"
                          : property.status === "Processing"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {property.status}
                    </span>
                    <span
                      className={`self-start sm:self-center px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                        property.paymentStatus === "Paid"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {property.paymentStatus}
                    </span>
                    <span
                      className={`self-start sm:self-center px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                        property?.report &&
                        typeof property?.report === "object" &&
                        "isApproved" in property?.report &&
                        property.report.isApproved
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
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
                    <span className="font-medium text-gray-900">
                      ₦{property.totalCost.toLocaleString()}
                    </span>
                  </div>
                  <Link
                    href={`/reva-restricted/dashboard/viewdetails?reference=${property.reference}`}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium group flex items-center"
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
              className="border-t-2 border-blue-400 bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border overflow-hidden"
            >
              <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-4">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 line-clamp-1">
                    {property?.description || "Untitled Property"}
                  </h3>
                  <div className="flex gap-2 flex-wrap">
                    <span
                      className={`self-start sm:self-center px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                        property.status === "Completed" ||
                        property.status === "Available"
                          ? "bg-green-100 text-green-800"
                          : property.status === "Processing"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {property.status}
                    </span>
                    <span
                      className={`self-start sm:self-center px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                        property.paymentStatus === "Paid"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {property.paymentStatus}
                    </span>
                    <span
                      className={`self-start sm:self-center px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                        property?.report &&
                        typeof property?.report === "object" &&
                        "isApproved" in property?.report &&
                        property.report.isApproved
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
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
                    <span className="font-medium text-gray-900">
                      ₦{property.totalCost.toLocaleString()}
                    </span>
                  </div>
                  <Link
                    href={`/reva-restricted/dashboard/viewdetails?reference=${property.reference}`}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium group flex items-center"
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
