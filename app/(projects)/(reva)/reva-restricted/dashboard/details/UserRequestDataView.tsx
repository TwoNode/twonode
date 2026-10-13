"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

import { toast } from "sonner";

import Link from "next/link";
import { REVA_COLORS } from "@/reva/colors";
import { EnlargeableImage, MediaLink } from "@/components/media";
import { revaApi } from "@/reva/apiClient";

const UserRequestDataView = ({ property }: { property: any }) => {
  const [openDeleteModal, setOpenDeleteModal] = useState(false);

  const toggleDeleteModal = () => {
    setOpenDeleteModal((prev) => !prev);
  };

  return (
    <>
      <div className="space-y-8 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
              {property?.title || "Untitled Request"}
            </h1>

            <p className="text-sm text-muted-foreground">
              REF: {property?.reference}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {property?.status && <Badge>{property.status}</Badge>}
            {property?.paymentStatus && (
              <Badge variant="secondary">{property.paymentStatus}</Badge>
            )}
            {property?.report?.isApproved && (
              <Badge
                className="w-full md:w-auto px-6 text-white"
                style={{ backgroundColor: REVA_COLORS.status.success }}
              >
                {"Approved"}
              </Badge>
            )}

            <Button
              variant="outline"
              disabled={
                property?.status !== "Completed" &&
                property?.status !== "Available"
              }
              className="max-sm:w-full rounded-lg"
              onClick={() => {
                if (property?.report?.directFileLink) {
                  const link = document.createElement("a");
                  link.href = property.report.directFileLink;
                  link.download = `${property?.title ?? "report"}.pdf`; // You can customize the file name
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                } else {
                  console.error("No file link available to download");
                  toast.error("Report will be ready soon.");
                }
              }}
            >
              Download Report
            </Button>
          </div>
        </div>

        {/* Property Information */}
        <Card>
          <CardHeader>
            <CardTitle>Property Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <Card>
          <CardHeader>
            <CardTitle>Site Images</CardTitle>
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
        <Card>
          <CardHeader>
            <CardTitle>Financial</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  ? "text-[#10b981]"
                  : "text-[#ef4444]"
              }
            />
            {property?.paymentLink && (
              <div className="col-span-2">
                <Button variant="link" size="sm" asChild>
                  <Link
                    href={property.paymentLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View Payment
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Supporting Documents */}
        <Card>
          <CardHeader>
            <CardTitle>Supporting Documents</CardTitle>
          </CardHeader>
          <CardContent>
            {Array.isArray(property?.documentsUrls) &&
            property.documentsUrls.length > 0 ? (
              <ul className="list-disc pl-6 space-y-1">
                {(property.documentsUrls as string[])?.map((url, idx) => (
                  <li key={idx}>
                    <MediaLink
                      href={revaApi.files.linkFor(url)}
                      className="underline"
                      style={{ color: REVA_COLORS.primary.light }}
                    >
                      Document {idx + 1}
                    </MediaLink>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="border-2 border-dashed border-gray-300 dark:border-white/10 rounded-lg p-6 text-center">
                <svg
                  className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-400"
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
                <p className="mt-2 text-sm text-muted-foreground">
                  No documents uploaded
                </p>
                {/* <Button className="mt-4">Upload Document</Button> */}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comments */}
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

        {/* Action Buttons */}
        <div className="flex justify-between items-center border-t pt-6 flex-wrap max-sm:justify-center gap-4">
          <Link href="/reva-restricted/dashboard">
            <Button variant="outline" className="max-sm:w-full rounded-lg">
              Back to All Requests
            </Button>
          </Link>

          <div className="flex gap-4">
            {/* <Button
              variant="destructive"
              className="max-sm:w-full rounded-lg"
              onClick={toggleDeleteModal}
            >
              Delete Request
            </Button> */}
          </div>
        </div>
      </div>

      {/* <AlertDialog open={openDeleteModal} onOpenChange={setOpenDeleteModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deleting this Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this due diligence request? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={toggleDeleteModal}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={toggleDeleteModal}>
              Delete Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog> */}
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
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p
      className={`text-sm ${bold ? "font-semibold" : ""} ${
        color || "text-gray-800"
      }`}
    >
      {value}
    </p>
  </div>
);

export default UserRequestDataView;
