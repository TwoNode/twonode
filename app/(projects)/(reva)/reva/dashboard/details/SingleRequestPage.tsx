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

import { PropertyWithoutUser } from "@/reva/services/propertyRequestService";
import Link from "next/link";
import { notifyInfo, notifyWarning } from "@/utils/notify";
import { PDFDownloadButton } from "@/app/(projects)/(reva)/reva-restricted/dashboard/details/components/PDFDownloadButton";
import { SecureDownloadDialog } from "@/reva/components/SecureDownloadDialog";
import { revaApi } from "@/reva/apiClient";
import { EnlargeableImage } from "@/components/media";

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

    // report.directFileLink is redacted out of the general fetch response
    // (propertyRequestService.ts) — `downloadAvailable` is the signal that
    // survives redaction for exactly this check.
    if ((report as any)?.downloadAvailable) {
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

  return (
    <>
      <div className="space-y-8 p-8 max-w-7xl mx-auto bg-gray-50 dark:bg-surface">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 bg-white dark:bg-surface p-6 rounded-xl shadow-sm">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              {property?.title || "Untitled Request"}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
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
          <CardHeader className="bg-linear-to-r from-blue-50 to-indigo-50 border-b dark:from-background dark:to-background">
            <CardTitle className="text-xl text-gray-800 dark:text-gray-200">
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
          <CardHeader className="bg-linear-to-r from-yellow-50 to-orange-50 border-b dark:from-background dark:to-background">
            <CardTitle className="text-xl text-gray-800 dark:text-gray-200">
              Site Images
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Array.isArray(property?.site_images) &&
            property.site_images.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {property.site_images.map((url: string, idx: number) => (
                  <div
                    key={idx}
                    className="rounded-lg overflow-hidden border bg-white dark:bg-surface shadow hover:shadow-lg transition-shadow"
                  >
                    <EnlargeableImage
                      href={revaApi.files.linkFor(url)}
                      alt={`Site Image ${idx + 1}`}
                      group={property.site_images.map((u: string, n: number) => ({
                        href: revaApi.files.linkFor(u),
                        name: `Site Image ${n + 1}`,
                        kind: "image" as const,
                      }))}
                      imgClassName="w-full h-48 object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-gray-400 dark:text-gray-400">
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
          <CardHeader className="bg-linear-to-r from-green-50 to-emerald-50 border-b dark:from-background dark:to-background">
            <CardTitle className="text-xl text-gray-800 dark:text-gray-200">
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
          <CardHeader className="bg-linear-to-r from-purple-50 to-pink-50 border-b dark:from-background dark:to-background">
            <CardTitle className="text-xl text-gray-800 dark:text-gray-200">
              Comments & Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Textarea
              value={property?.comments || "No remarks"}
              readOnly
              rows={4}
              className="resize-none bg-gray-50 dark:bg-surface border-gray-200 dark:border-white/10"
            />
          </CardContent>
        </Card>

        {/* Report Status */}
        <Card className="overflow-hidden border-none shadow-md">
          <CardHeader className="bg-linear-to-r from-blue-50 to-indigo-50 border-b dark:from-background dark:to-background">
            <CardTitle className="text-xl text-gray-800 dark:text-gray-200">
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
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {isReportReady()
                    ? "Your due diligence report is ready for download. The report contains comprehensive property analysis including title search, survey records, charting information, and land use details."
                    : "Your report is being processed. This may take 24-48 hours. You'll be notified when it's ready."}
                </p>
                {property?.report?.updatedAt && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
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
              <div className="shrink-0">
                <SecureDownloadDialog
                  label={isReportReady() ? "Download Report" : "Processing..."}
                  reference={property?.reference}
                  target="report"
                  authenticated
                  disabled={!isReportReady()}
                  className="px-6 py-2 rounded-lg transition-colors"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-between items-center border-t border-gray-200 dark:border-white/10 pt-8 flex-wrap max-sm:justify-center gap-4">
          <Link href="/reva/dashboard">
            <Button
              variant="outline"
              className="max-sm:w-full rounded-lg hover:bg-gray-100 dark:hover:bg-surface transition-colors"
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

            <PDFDownloadButton
              property={property}
              type="receipt"
              disabled={property?.paymentStatus?.toLowerCase() !== "paid"}
              className="max-sm:w-full"
            />
          </div>
        </div>
      </div>

      <AlertDialog open={openDeleteModal} onOpenChange={setOpenDeleteModal}>
        <AlertDialogContent className="max-w-md rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl text-red-600">
              Deleting this Request
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-300">
              Are you sure you want to delete this due diligence request? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel
              onClick={toggleDeleteModal}
              className="rounded-lg hover:bg-gray-100 dark:hover:bg-surface"
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
  <div className="bg-white dark:bg-surface p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow">
    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
      {label}
    </p>
    <p
      className={`text-base ${bold ? "font-semibold" : ""} ${
        color || "text-gray-900"
      }`}
    >
      {value}
    </p>
  </div>
);

export default SingleRequestPage;
