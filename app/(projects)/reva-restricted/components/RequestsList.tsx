"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format, addDays } from "date-fns";
import Link from "next/link";

const RequestList = ({ requests }: { requests: any[] }) => {
  return (
    <div className="grid gap-6 p-6">
      {requests.map((req) => (
        <Card
          key={req?.id}
          className={`p-4 shadow-sm hover:shadow-md transition-all ${
            req?.deleted ? "bg-red-50" : ""
          }`}
        >
          <CardContent className="space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">
                  {req?.title || "Untitled Request"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  REF: {req?.reference} · LGA: {req?.lga}
                </p>

                {req?.user && (
                  <p className="text-sm text-muted-foreground">
                    By: {req?.user.firstName} {req?.user.lastName} ({" "}
                    {req?.user.email})
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2 items-end">
                <Badge
                  variant="outline"
                  className={
                    ["Available", "Completed"].includes(req?.status)
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }
                >
                  {req?.status}
                </Badge>
                <Badge
                  className={`transition-colors ${
                    req?.paymentStatus === "Paid"
                      ? "bg-green-100 text-green-700 hover:text-white hover:bg-green-700"
                      : "bg-red-100 text-red-700 hover:text-white hover:bg-red-700"
                  }`}
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
                <p className="text-sm font-medium text-blue-600">
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
                  className={`text-sm ${
                    new Date() > addDays(new Date(req?.updatedAt), 1)
                      ? "text-red-600"
                      : ""
                  }`}
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
                <ul className="list-disc pl-5 text-sm text-blue-600">
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
                  <Badge className="transition-colors bg-green-100 text-green-700 hover:text-white hover:bg-green-700">
                    Approved
                  </Badge>
                ) : (
                  <Badge className="transition-colors bg-yellow-100 text-yellow-700 hover:text-white hover:bg-yellow-700">
                    Under Review
                  </Badge>
                )
              ) : (
                <Badge className="transition-colors bg-red-100 text-red-700 hover:text-white hover:bg-red-700">
                  No Report
                </Badge>
              )}
              <Link
                href={`/reva-restricted/dashboard/viewdetails?reference=${req?.reference}`}
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

export default RequestList;
