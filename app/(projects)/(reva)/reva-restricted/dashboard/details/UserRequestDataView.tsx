"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

import { toast } from "sonner";

import Link from "next/link";
import { REVA_COLORS } from "@/reva/colors";
import { EnlargeableImage, MediaLink } from "@/components/media";
import { revaApi } from "@/reva/apiClient";
import {
  Fact,
  StatusPill,
  documentLabel,
  toneForPayment,
  toneForStatus,
} from "../../components/requestUi";

const formatDay = (value?: string | Date | null) =>
  value
    ? new Date(value).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "-";

const UserRequestDataView = ({ property }: { property: any }) => {
  const siteImages: string[] = Array.isArray(property?.site_images)
    ? property.site_images
    : [];
  const documents: string[] = Array.isArray(property?.documentsUrls)
    ? property.documentsUrls
    : [];

  return (
    <div className="space-y-6">
      {/* Summary: what the request is, where it stands, and the report download */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {property?.title || property?.address || "Untitled Request"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {property?.title && property.title !== property?.address
              ? `${property.address} · `
              : ""}
            {property?.lga}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {property?.status && (
              <StatusPill tone={toneForStatus(property.status)}>
                {property.status}
              </StatusPill>
            )}
            {property?.paymentStatus && (
              <StatusPill tone={toneForPayment(property.paymentStatus)}>
                {property.paymentStatus}
              </StatusPill>
            )}
            {property?.report?.isApproved && (
              <StatusPill tone="success">Report approved</StatusPill>
            )}
          </div>
        </div>

        <Button
          variant="outline"
          disabled={
            property?.status !== "Completed" && property?.status !== "Available"
          }
          className="max-sm:w-full rounded-lg"
          onClick={() => {
            if (property?.report?.directFileLink) {
              const link = document.createElement("a");
              link.href = revaApi.files.getDownloadUrl(
                property.report.directFileLink,
                `${property?.title ?? "report"}.pdf`
              );
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
          Download uploaded report
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Property Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <Fact label="Address" className="sm:col-span-2">
                  {property?.address || "-"}
                </Fact>
                <Fact label="LGA">{property?.lga || "-"}</Fact>
                <Fact label="Parcel ID">
                  <span className="font-mono">{property?.parcelId || "-"}</span>
                </Fact>
                <Fact label="Created">{formatDay(property?.createdAt)}</Fact>
                <Fact label="Last updated">
                  {formatDay(property?.updatedAt)}
                </Fact>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Site Images
                {siteImages.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {siteImages.length}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {siteImages.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {siteImages.map((url: string, idx: number) => (
                    <div
                      key={idx}
                      className="overflow-hidden rounded-lg border border-border bg-surface-muted"
                    >
                      <EnlargeableImage
                        href={revaApi.files.linkFor(url)}
                        alt={`Site Image ${idx + 1}`}
                        group={siteImages.map((u: string, n: number) => ({
                          href: revaApi.files.linkFor(u),
                          name: `Site Image ${n + 1}`,
                          kind: "image" as const,
                        }))}
                        imgClassName="h-40 w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyNote>No site images uploaded</EmptyNote>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Comments</CardTitle>
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

        {/* Side column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Financial</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4">
                <Fact label="Total cost">
                  <span className="text-lg font-semibold">
                    ₦{property?.totalCost?.toLocaleString()}
                  </span>
                </Fact>
                <Fact label="Payment status">
                  {property?.paymentStatus ? (
                    <StatusPill tone={toneForPayment(property.paymentStatus)}>
                      {property.paymentStatus}
                    </StatusPill>
                  ) : (
                    "-"
                  )}
                </Fact>
              </dl>
              {property?.paymentLink && (
                <Button variant="link" size="sm" asChild className="mt-2 px-0">
                  <Link
                    href={property.paymentLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View Payment
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Supporting Documents
                {documents.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {documents.length}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {documents.length > 0 ? (
                <ul className="space-y-2">
                  {documents.map((url, idx) => (
                    <li key={idx}>
                      <MediaLink
                        href={revaApi.files.linkFor(url)}
                        className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-surface-muted"
                        style={{ color: REVA_COLORS.primary.light }}
                      >
                        <span className="truncate">
                          {documentLabel(url, idx)}
                        </span>
                      </MediaLink>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyNote>No documents uploaded</EmptyNote>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

const EmptyNote = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
    {children}
  </div>
);

export default UserRequestDataView;
