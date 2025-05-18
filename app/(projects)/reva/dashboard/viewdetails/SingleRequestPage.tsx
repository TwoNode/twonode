"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

const SingleRequestPage = ({ property }: { property: any }) => {
  return (
    <>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">
              Property Request: {property?.title || "Untitled"}
            </h1>
            <p className="text-sm text-muted-foreground">
              REF: {property?.reference} · Residential
            </p>
          </div>
          <div className="flex items-center gap-2">
            {property?.status && <Badge>{property?.status}</Badge>}
            {property?.paymentStatus && (
              <Badge variant="secondary">{property?.paymentStatus}</Badge>
            )}
            <Button variant="outline">Download Report</Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Property Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Address</p>
              <p>{property?.address}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">LGA</p>
              <p>{property?.lga}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Parcel ID</p>
              <p>{property?.parcelId || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p>
                {property?.createdAt
                  ? new Date(property.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last Updated</p>
              <p>
                {property?.updatedAt
                  ? new Date(property.updatedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "-"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total Cost</p>
              <p className="font-medium">
                ₦{property?.totalCost.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Payment Status</p>
              <p>{property?.paymentStatus || "-"}</p>
            </div>
            {property?.paymentLink && (
              <div className="col-span-2">
                <Button variant="link" size="sm" asChild>
                  <a
                    href={property?.paymentLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View Payment
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Supporting Documents</CardTitle>
          </CardHeader>
          <CardContent>
            {property?.documentsUrls.length > 0 ? (
              <ul className="list-disc pl-6 space-y-1">
                {property?.documentsUrls.map((url: string, idx: number) => (
                  <li key={idx}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      Document {idx + 1}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm italic text-muted-foreground">
                No documents uploaded
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={property?.comments || "No remarks"}
              readOnly
              rows={4}
            />
          </CardContent>
        </Card>
      </div>

      <SinglePropertyRequest />
    </>
  );
};

export default SingleRequestPage;

const SinglePropertyRequest = () => {
  // Mock data - replace with your actual data fetching
  const propertyData = {
    id: "id123",
    title: "Testing the Luxury",
    ref: "REVA_OfSafeD130",
    type: "Residential",
    status: "Completed",
    paymentStatus: "Paid",
    address1: "5O Martins St, Idi Oro, Lagos 102215, Lagos, Nigeria",
    address2: "Mushin 102215, Lagos, Nigeria",
    totalCost: "N40,000",
    lastUpdated: "13 May 2025",
    timeline: [
      {
        event: "Request Completed",
        date: "13 May 2025 • 14:30",
        description:
          "Payment processed and property transfer completed successfully.",
        completed: true,
      },
      {
        event: "Payment Received",
        date: "12 May 2025 • 10:15",
        description: "Payment of N40,000 confirmed.",
        completed: true,
      },
      {
        event: "Request Submitted",
        date: "10 May 2025 • 09:00",
        description: "Initial request created by user.",
        completed: true,
      },
    ],
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Your existing sidebar component would go here */}

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-6">
          {/* Header Section */}
          <header className="mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  {propertyData.title}
                </h1>
                <p className="text-gray-600 mt-1">
                  REF: {propertyData.ref} - {propertyData.type}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  propertyData.status === "Completed"
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {propertyData.status} • {propertyData.paymentStatus}
              </span>
            </div>
          </header>

          {/* Property Details */}
          <section className="mb-8">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">
                ADDRESS
              </h2>
              <p className="text-gray-600">{propertyData.address1}</p>
              <p className="text-gray-600">{propertyData.address2}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">
                  TOTAL COST
                </h3>
                <p className="text-gray-800 font-medium">
                  {propertyData.totalCost}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">
                  LAST UPDATED
                </h3>
                <p className="text-gray-800 font-medium">
                  {propertyData.lastUpdated}
                </p>
              </div>
            </div>
          </section>

          {/* Supporting Documents */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              Supporting Documents
            </h2>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No documents uploaded
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Upload supporting documents for this request
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg
                    className="-ml-1 mr-2 h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Upload Document
                </button>
              </div>
            </div>
          </section>

          {/* Timeline */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              Request Timeline
            </h2>
            <div className="flow-root">
              <ul className="-mb-8">
                {propertyData.timeline.map((event, eventIdx) => (
                  <li key={eventIdx}>
                    <div className="relative pb-8">
                      {eventIdx !== propertyData.timeline.length - 1 ? (
                        <span
                          className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                          aria-hidden="true"
                        />
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span
                            className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                              event.completed ? "bg-green-500" : "bg-gray-400"
                            }`}
                          >
                            {event.completed ? (
                              <svg
                                className="h-5 w-5 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                aria-hidden="true"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            ) : (
                              <svg
                                className="h-5 w-5 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                aria-hidden="true"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-gray-800 font-medium">
                              {event.event}
                              <span className="text-gray-500 font-normal ml-2">
                                {event.date}
                              </span>
                            </p>
                            <p className="text-sm text-gray-500">
                              {event.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Action Buttons */}
          <div className="flex justify-between items-center border-t pt-6">
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              Back to All Requests
            </button>
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Download Receipt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
