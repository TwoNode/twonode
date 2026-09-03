"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format, addDays } from "date-fns";
import Link from "next/link";
import { REVA_COLORS, revaStatusBadgeStyle } from "@/reva/colors";

const OneTimeRequestList = ({ requests }: { requests: any[] }) => {
  return (
    <div className="grid gap-6 p-6">
      {requests.map((req) => (
        <Card
          key={req?.id}
          className={`p-4 shadow-sm hover:shadow-md transition-all`}
        >
          <CardContent className="space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">
                  {req?.description || "Untitled Request"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  REF: {req?.reference} · LGA: {req?.lga}
                </p>
                <p className="text-sm text-muted-foreground">
                  Email: {req?.email}
                </p>
              </div>

              <div className="flex flex-col gap-2 items-end">
                <Badge
                  variant="outline"
                  style={revaStatusBadgeStyle(
                    req?.status === "Completed" ? "success" : "warning"
                  )}
                >
                  {req?.status}
                </Badge>
                <Badge
                  className="transition-colors"
                  style={revaStatusBadgeStyle(
                    req?.paymentStatus === "Paid" ? "success" : "error"
                  )}
                >
                  {req?.paymentStatus}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Address</p>
                <p className="text-sm">{req?.address}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Parcel ID</p>
                <p className="text-sm">{req?.parcelId || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Cost</p>
                <p
                  className="text-sm font-medium"
                  style={{ color: REVA_COLORS.primary.light }}
                >
                  ₦{req?.totalCost.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last Updated</p>
                <p className="text-sm">
                  {format(new Date(req?.updatedAt), "dd MMM yyyy, hh:mm a")}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Due Date</p>
                <p
                  className="text-sm"
                  style={{
                    color:
                      new Date() > addDays(new Date(req?.updatedAt), 1)
                        ? REVA_COLORS.status.error
                        : undefined,
                  }}
                >
                  {format(
                    addDays(new Date(req?.updatedAt), 1),
                    "dd MMM yyyy, hh:mm a"
                  )}
                </p>
              </div>
            </div>

            {req?.documentsUrls.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Documents</p>
                <ul
                  className="list-disc pl-5 text-sm"
                  style={{ color: REVA_COLORS.primary.light }}
                >
                  {req?.documentsUrls.map((url: string, idx: number) => (
                    <li key={idx}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        Document {idx + 1}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-between">
              {req?.report ? (
                req?.report?.isApproved ? (
                  <Badge
                    className="transition-colors"
                    style={revaStatusBadgeStyle("success")}
                  >
                    Approved
                  </Badge>
                ) : (
                  <Badge
                    className="transition-colors"
                    style={revaStatusBadgeStyle("warning")}
                  >
                    Under Review
                  </Badge>
                )
              ) : (
                <Badge
                  className="transition-colors"
                  style={revaStatusBadgeStyle("error")}
                >
                  No Report
                </Badge>
              )}
              <Link
                href={`/reva-restricted/dashboard/details?reference=${req?.reference}`}
              >
                <Button size="sm" variant="secondary">
                  View Request
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default OneTimeRequestList;
