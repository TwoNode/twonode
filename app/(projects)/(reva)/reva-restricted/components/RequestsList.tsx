"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { format, addDays } from "date-fns";
import { DocumentTextIcon, EyeIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { REVA_COLORS } from "@/reva/colors";
import { MediaLink } from "@/components/media";
import { revaApi } from "@/reva/apiClient";
import { cn } from "@/lib/utils";
import {
  Fact,
  StatusPill,
  documentLabel,
  toneForPayment,
  toneForStatus,
} from "./requestUi";

interface Request {
  id: string;
  reference: string;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  paymentStatus?: string | null;
  statusMessage?: string | null;
  error?: string | null;
  deleted?: boolean;

  // OneTime request fields
  requester?: string | null;
  email?: string;
  userPhoneNumber?: string | null;

  // Regular request fields
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };

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
  report?: any;
  isOneTimeRequest?: boolean;
}

interface RequestListProps {
  requests: Request[];
  title?: string;
  showStats?: boolean;
}

const isOneTime = (request: Request) =>
  !!(request?.isOneTimeRequest || request?.requester || request?.email);

const requesterOf = (request: Request) =>
  isOneTime(request)
    ? {
        name: request.requester || "OneTime User",
        email: request.email,
        phone: request.userPhoneNumber,
      }
    : {
        name: request.user
          ? `${request.user.firstName} ${request.user.lastName}`
          : "Unknown User",
        email: request.user?.email,
        phone: null,
      };

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const referenceDate = (request: Request) => {
  const value = request.updatedAt || request.createdAt;
  return value ? new Date(value) : new Date();
};

const RequestList = ({
  requests,
  title,
  showStats = true,
}: RequestListProps) => {
  if (requests.length === 0) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed border-border bg-surface">
        <div className="text-center">
          <DocumentTextIcon className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
          <h3 className="mb-1 text-base font-medium text-foreground">
            No requests found
          </h3>
          <p className="text-sm text-muted-foreground">
            No property requests match your criteria.
          </p>
        </div>
      </div>
    );
  }

  const oneTimeCount = requests.filter(isOneTime).length;
  const regularCount = requests.length - oneTimeCount;

  return (
    <div className="space-y-4">
      {showStats && (
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
          <p className="text-sm text-muted-foreground">
            {title ? `${title}: ` : ""}Showing {requests.length}{" "}
            {requests.length === 1 ? "request" : "requests"}
          </p>
          <p className="text-sm text-muted-foreground">
            {regularCount} regular · {oneTimeCount} one-time
          </p>
        </div>
      )}

      <ul className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {requests.map((request) => {
          const requester = requesterOf(request);
          const oneTime = isOneTime(request);
          const due = addDays(referenceDate(request), 1);
          const overdue = new Date() > due;
          const documents = request.documentsUrls ?? [];
          const report = request.report;
          const heading =
            request.address ||
            request.title ||
            request.description ||
            "Untitled request";

          return (
            <li
              key={request.id}
              className={cn(
                "flex flex-col rounded-xl border bg-white p-5 transition-shadow hover:shadow-md dark:bg-surface",
                request?.deleted
                  ? "border-red-200 bg-red-50/40"
                  : "border-border"
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {oneTime ? "One-time" : "Regular"}
                </span>
                {request.status && (
                  <StatusPill tone={toneForStatus(request.status)}>
                    {request.status}
                  </StatusPill>
                )}
                {request.paymentStatus && (
                  <StatusPill tone={toneForPayment(request.paymentStatus)}>
                    {request.paymentStatus}
                  </StatusPill>
                )}
                {request.deleted && (
                  <StatusPill tone="error">Deleted</StatusPill>
                )}
              </div>

              <h3 className="mt-3 line-clamp-2 text-base font-semibold leading-snug text-foreground">
                {heading}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="font-mono">{request.reference}</span>
                {request.lga ? ` · ${request.lga}` : ""}
                {request.parcelId ? ` · Parcel ${request.parcelId}` : ""}
              </p>

              <dl className="mt-4 grid grid-cols-1 gap-x-4 gap-y-3 border-t border-border pt-4 sm:grid-cols-3">
                <Fact label="Requester">
                  <span className="block font-medium">{requester.name}</span>
                  {requester.email && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {requester.email}
                    </span>
                  )}
                  {requester.phone && (
                    <span className="block text-xs text-muted-foreground">
                      {requester.phone}
                    </span>
                  )}
                </Fact>
                <Fact label="Fee">
                  <span
                    className="text-base font-semibold"
                    style={{ color: REVA_COLORS.primary.light }}
                  >
                    {formatCurrency(request.totalCost)}
                  </span>
                </Fact>
                <Fact label={overdue ? "Was due" : "Due"}>
                  <span
                    className={cn(overdue && "font-medium")}
                    style={
                      overdue ? { color: REVA_COLORS.status.error } : undefined
                    }
                  >
                    {format(due, "dd MMM yyyy, hh:mm a")}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {request.updatedAt ? "Updated" : "Created"}{" "}
                    {format(referenceDate(request), "dd MMM yyyy")}
                  </span>
                </Fact>
              </dl>

              {documents.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Documents
                  </span>
                  {documents.slice(0, 3).map((url, index) => (
                    <MediaLink
                      key={index}
                      href={revaApi.files.linkFor(url)}
                      className="inline-flex max-w-[11rem] items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-foreground transition-colors hover:bg-surface-muted"
                    >
                      <DocumentTextIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">
                        {documentLabel(url, index)}
                      </span>
                    </MediaLink>
                  ))}
                  {documents.length > 3 && (
                    <span className="text-xs text-muted-foreground">
                      +{documents.length - 3} more
                    </span>
                  )}
                </div>
              )}

              {request.statusMessage && (
                <p
                  className="mt-4 rounded-lg border px-3 py-2 text-sm"
                  style={{
                    backgroundColor: `${REVA_COLORS.primary.light}0D`,
                    borderColor: `${REVA_COLORS.primary.light}33`,
                    color: REVA_COLORS.primary.main,
                  }}
                >
                  {request.statusMessage}
                </p>
              )}
              {request.error && (
                <p
                  className="mt-4 rounded-lg border px-3 py-2 text-sm"
                  style={{
                    backgroundColor: `${REVA_COLORS.status.error}0D`,
                    borderColor: `${REVA_COLORS.status.error}33`,
                    color: REVA_COLORS.status.error,
                  }}
                >
                  {request.error}
                </p>
              )}

              <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                {report ? (
                  report?.isApproved ? (
                    <StatusPill tone="success">Report approved</StatusPill>
                  ) : (
                    <StatusPill tone="warning">Report under review</StatusPill>
                  )
                ) : (
                  <StatusPill tone="error">No report</StatusPill>
                )}
                <Button asChild size="sm" variant="secondary">
                  <Link
                    href={`/reva-restricted/dashboard/details?reference=${request.reference}`}
                  >
                    <EyeIcon className="mr-2 h-4 w-4" />
                    View details
                  </Link>
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default RequestList;
