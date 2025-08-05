"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  PDFDownloadLink,
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

import { PropertyWithoutUser } from "../../actions/revaActions";
import Link from "next/link";
import {
  notifyError,
  notifyInfo,
  notifySuccess,
  notifyWarning,
} from "@/utils/notify";

export type ReportType = {
  centroid: string | null; // e.g. "6.5244, 3.3792"

  titleStatus: string; // "is a duly registered instrument" | "is not a duly registered instrument"
  titleDate: string | null; // e.g. "2022-08-15"
  titleName: string | null; // e.g. "Mr John Doe"
  titleNumber: string; // e.g. "Number 33 Page 33 in Volume 2580"

  rightToSellHolder: string; // e.g. "Mr Reva"

  transactionFlow: string; // List all transaction flow details

  parcelPositionMatch: string; // e.g. "99.99%"
  parcelStatus: string; // e.g. "Free from any known Government Acquisition"
  implicationOfParcelStatus: string | null; // e.g. "No government claim risk"

  commitmentStatus: string | null; // e.g. "Committed"
  implicationOfCommitmentStatus: string | null; // e.g. "May require government consent"

  setbacksInfo: string; // e.g. "Falls partly within the offset of the Open Canal"
  implicationOfsetbacksInfo: string | null; // e.g. "Possible construction limitation"

  surveyPlanNumber: string; // e.g. "LS/D/LA/2580"
  surveyName: string; // e.g. "LEGRANDE PROPERTY DEVELOPMENT COMPANY LTD"
  dateOnSurveyPlan: string | null; // e.g. "2020-11-22"

  historicalSurveys: string; // e.g. "Survey by XYZ in 2010, updated in 2016"
  zoning: string; // e.g. "Residential"

  hasBuildingPlanApproval: boolean; // true = Yes, false = No
  buildingPlanNo: string; // e.g. "BP/LA/2025/0001"

  images: {
    transactionFlowImg: string; // Transaction Flow of Property Parcel
    parcelCheck: string; // Parcel Check
    parcelChartingFree: string; // Parcel Charting (Free from Government Acquisition)
    parcelChartingOffset: string; // Parcel Charting (Falls within setback)
    landUseCheck: string; // Parcel Land Use Check
  };
};

const SingleRequestPage = ({
  property,
}: {
  property: PropertyWithoutUser | any;
}) => {
  const [openDeleteModal, setOpenDeleteModal] = useState(false);

  const toggleDeleteModal = () => {
    setOpenDeleteModal((prev) => !prev);
  };

  const isReportReady = () => {
    const report = property?.report;

    const isApproved =
      typeof report === "object" &&
      report !== null &&
      "isApproved" in report &&
      (report as any).isApproved === true;

    if (!isApproved) return false;

    if ("directFileLink" in (report || {})) {
      return true;
    }

    const requiredKeys: (keyof ReportType)[] = [
      "titleName",
      "titleDate",
      "titleStatus",
      "titleNumber",
      "rightToSellHolder",
      "transactionFlow",
      "parcelPositionMatch",
      "parcelStatus",
      "surveyPlanNumber",
      "surveyName",
      "historicalSurveys",
      "zoning",
      "setbacksInfo",
      "images",
      ...(report?.hasBuildingPlanApproval
        ? ["buildingPlanNo" as keyof ReportType]
        : []),
    ];

    const hasAllFields =
      typeof report === "object" &&
      report !== null &&
      requiredKeys.every((key) => key in report);

    return hasAllFields;
  };

  const handleDownloadReport = () => {
    try {
      if (
        property?.report &&
        typeof property.report === "object" &&
        "directFileLink" in property.report
      ) {
        const link = document.createElement("a");
        const directFileLink = (property.report as { directFileLink: string })
          .directFileLink;

        if (!directFileLink) {
          notifyError("No valid file link available to download");
          return;
        }

        link.href = directFileLink;
        link.download = `${property?.title ?? "report"}.pdf`;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        notifySuccess("Report download started successfully!");
      } else {
        notifyError("Report is not ready for download yet");
      }
    } catch (error) {
      console.error("Error downloading report:", error);
      notifyError("Failed to download report. Please try again.");
    }
  };
  return (
    <>
      <div className="space-y-8 p-8 max-w-7xl mx-auto bg-gray-50">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 bg-white p-6 rounded-xl shadow-sm">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              {property?.title || "Untitled Request"}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Reference ID:{" "}
              <span className="font-medium">{property?.reference}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {property?.status && (
              <Badge className="px-4 py-1 text-sm font-medium">
                {property.status}
              </Badge>
            )}
            {property?.paymentStatus && (
              <Badge
                variant="secondary"
                className="px-4 py-1 text-sm font-medium"
              >
                {property.paymentStatus}
              </Badge>
            )}
            {isReportReady() && (
              <Badge className="px-6 py-1.5 text-sm font-medium bg-emerald-500 text-white">
                Approved
              </Badge>
            )}
          </div>
        </div>

        {/* Property Information */}
        <Card className="overflow-hidden border-none shadow-md">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <CardTitle className="text-xl text-gray-800">
              Property Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
            <Info label="Address" value={property?.address} />
            <Info label="LGA" value={property?.lga} />
            <Info label="Parcel ID" value={property?.parcelId || "-"} />
            <Info
              label="Created"
              value={
                property?.createdAt
                  ? new Date(property.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "-"
              }
            />
            <Info
              label="Last Updated"
              value={
                property?.updatedAt
                  ? new Date(property.updatedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "-"
              }
            />
          </CardContent>
        </Card>

        {/* Site Images */}
        <Card className="overflow-hidden border-none shadow-md">
          <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50 border-b">
            <CardTitle className="text-xl text-gray-800">Site Images</CardTitle>
          </CardHeader>
          <CardContent>
            {Array.isArray(property?.site_images) &&
            property.site_images.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {property.site_images.map((url: string, idx: number) => (
                  <div
                    key={idx}
                    className="rounded-lg overflow-hidden border bg-white shadow hover:shadow-lg transition-shadow"
                  >
                    <img
                      src={url}
                      alt={`Site Image ${idx + 1}`}
                      className="w-full h-48 object-cover"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-gray-400">
                <svg
                  className="w-12 h-12 mb-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span className="text-sm">No site images uploaded</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial */}
        <Card className="overflow-hidden border-none shadow-md">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
            <CardTitle className="text-xl text-gray-800">
              Financial Details
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
            <Info
              label="Total Cost"
              value={`₦${property?.totalCost?.toLocaleString()}`}
              bold
            />
            <Info
              label="Payment Status"
              value={property?.paymentStatus || "-"}
              color={
                property?.paymentStatus === "Paid"
                  ? "text-emerald-600"
                  : "text-red-600"
              }
            />
            {property?.paymentLink && (
              <div className="col-span-2">
                <Button
                  variant="link"
                  size="lg"
                  asChild
                  className="text-blue-600 hover:text-blue-700"
                >
                  <Link
                    href={property.paymentLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Payment Details →
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comments */}
        <Card className="overflow-hidden border-none shadow-md">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
            <CardTitle className="text-xl text-gray-800">
              Comments & Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Textarea
              value={property?.comments || "No remarks"}
              readOnly
              rows={4}
              className="resize-none bg-gray-50 border-gray-200"
            />
          </CardContent>
        </Card>

        {/* Report Status */}
        <Card className="overflow-hidden border-none shadow-md">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <CardTitle className="text-xl text-gray-800">
              Due Diligence Report
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Badge
                    variant={isReportReady() ? "default" : "secondary"}
                    className={`px-3 py-1 text-sm font-medium ${
                      isReportReady()
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {isReportReady() ? "Ready" : "Processing"}
                  </Badge>
                  {property?.report?.isApproved && (
                    <Badge className="px-3 py-1 text-sm font-medium bg-blue-500 text-white">
                      Approved
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  {isReportReady()
                    ? "Your due diligence report is ready for download. The report contains comprehensive property analysis including title search, survey records, charting information, and land use details."
                    : "Your report is being processed. This may take 24-48 hours. You'll be notified when it's ready."}
                </p>
                {property?.report?.updatedAt && (
                  <p className="text-xs text-gray-500 mt-2">
                    Last updated:{" "}
                    {new Date(property.report.updatedAt).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </p>
                )}
              </div>
              <div className="flex-shrink-0">
                <Button
                  onClick={handleDownloadReport}
                  disabled={!isReportReady()}
                  className={`px-6 py-2 rounded-lg transition-colors ${
                    isReportReady()
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {isReportReady() ? (
                    <>
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      Download Report
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4 mr-2 animate-spin"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      Processing...
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-between items-center border-t border-gray-200 pt-8 flex-wrap max-sm:justify-center gap-4">
          <Link href="/reva/dashboard">
            <Button
              variant="outline"
              className="max-sm:w-full rounded-lg hover:bg-gray-100 transition-colors"
            >
              ← Back to All Requests
            </Button>
          </Link>

          <div className="flex gap-4">
            <Button
              variant="destructive"
              className="max-sm:w-full rounded-lg transition-all hover:bg-red-700"
              onClick={toggleDeleteModal}
              disabled
            >
              Delete Request
            </Button>

            <Button
              disabled
              className="max-sm:w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 transition-colors"
            >
              Download Receipt
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={openDeleteModal} onOpenChange={setOpenDeleteModal}>
        <AlertDialogContent className="max-w-md rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl text-red-600">
              Deleting this Request
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Are you sure you want to delete this due diligence request? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel
              onClick={toggleDeleteModal}
              className="rounded-lg hover:bg-gray-100"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={toggleDeleteModal}
              className="rounded-lg bg-red-600 hover:bg-red-700"
            >
              Delete Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const Info = ({
  label,
  value,
  bold,
  color,
}: {
  label: string;
  value: string;
  bold?: boolean;
  color?: string;
}) => (
  <div className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow">
    <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
    <p
      className={`text-base ${bold ? "font-semibold" : ""} ${
        color || "text-gray-900"
      }`}
    >
      {value}
    </p>
  </div>
);

const ReceiptPDF = ({ property }: { property: any }) => {
  const styles = StyleSheet.create({
    page: { padding: 30, fontFamily: "Helvetica" },
    title: {
      fontSize: 20,
      marginBottom: 20,
      textAlign: "center",
      color: "#166534",
      fontWeight: "bold",
    },
    section: { marginBottom: 10 },
    label: { fontWeight: "bold", color: "#166534" },
    value: { marginLeft: 8 },
    ref: {
      color: "#2563eb",
      fontWeight: "bold",
      fontSize: 14,
      marginBottom: 10,
      textAlign: "center",
    },
    footer: { marginTop: 30, textAlign: "center", fontSize: 10, color: "#888" },
  });
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Due Diligence Payment Receipt</Text>
        <Text style={styles.ref}>Reference: {property?.reference}</Text>
        <View style={styles.section}>
          <Text>
            <Text style={styles.label}>Requester Name:</Text>{" "}
            <Text style={styles.value}>{property?.requester}</Text>
          </Text>
          <Text>
            <Text style={styles.label}>Email:</Text>{" "}
            <Text style={styles.value}>{property?.email}</Text>
          </Text>
          <Text>
            <Text style={styles.label}>Property Address:</Text>{" "}
            <Text style={styles.value}>{property?.address}</Text>
          </Text>
          <Text>
            <Text style={styles.label}>Location:</Text>{" "}
            <Text style={styles.value}>
              {property?.lat}, {property?.lng}
            </Text>
          </Text>
          <Text>
            <Text style={styles.label}>Parcel ID:</Text>{" "}
            <Text style={styles.value}>{property?.parcelId}</Text>
          </Text>
          <Text>
            <Text style={styles.label}>LGA:</Text>{" "}
            <Text style={styles.value}>{property?.lga}</Text>
          </Text>
          <Text>
            <Text style={styles.label}>Total Cost:</Text>{" "}
            <Text style={styles.value}>
              {property?.totalCost?.toLocaleString("en-NG", {
                style: "currency",
                currency: "NGN",
              })}
            </Text>
          </Text>
          {property?.comments && (
            <Text>
              <Text style={styles.label}>Comments:</Text>{" "}
              <Text style={styles.value}>{property?.comments}</Text>
            </Text>
          )}
        </View>
        <Text style={styles.footer}>
          Thank you for your payment. This receipt is system generated and valid
          without signature.
        </Text>
      </Page>
    </Document>
  );
};

export default SingleRequestPage;
