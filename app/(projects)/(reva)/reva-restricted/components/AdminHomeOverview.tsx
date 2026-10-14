import React from "react";
import Link from "next/link";
import Welcome from "../dashboard/components/Welcome";
import { REVA_GRADIENTS } from "@/reva/colors";
import RequestList from "./RequestsList";
import { RequestStatCards } from "./RequestStatCards";
import { summarizeRequests } from "./requestStats";

const naira = (n: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(n);

type Rows = Parameters<typeof summarizeRequests>[0];

/** The admin home: counts, what needs attention, and the latest requests. Pure presentation of what the page fetched. */
export function AdminHomeOverview({
  oneTimeRows,
  propertyRows,
  recent,
}: {
  oneTimeRows: Rows;
  propertyRows: Rows;
  recent: React.ComponentProps<typeof RequestList>["requests"];
}) {
  const summary = summarizeRequests(oneTimeRows, propertyRows);

  const attention = [
    {
      label: "Need a report",
      hint: "Upload the report so the requester gets their result",
      count: summary.needsReport,
      href: "/reva-restricted/dashboard/alluserrequests",
      color: "#ef4444",
    },
    {
      label: "Reports awaiting approval",
      hint: "Review and approve",
      count: summary.inReview,
      href: "/reva-restricted/dashboard/review",
      color: "#f59e0b",
    },
    {
      label: "Unpaid requests",
      hint: "Verify the payment with Paystack",
      count: summary.unpaid,
      href: "/reva-restricted/dashboard/payment-verification",
      color: "#8b5cf6",
    },
  ];

  return (
    <div className="flex flex-col p-[47px_60px] max-xl:p-[30px_40px] max-lg:p-[15px_30px] max-sm:p-[10px_15px] max-md:p-[10px_20px] max-w-full">
      <Welcome />

      <div className="mx-auto mt-8 w-full max-w-6xl">
        <RequestStatCards
          cards={[
            {
              id: "total",
              label: "Total requests",
              value: String(summary.total),
              hint: `${summary.oneTime} one-time · ${summary.regular} regular`,
            },
            {
              id: "none",
              label: "Needs report",
              value: String(summary.needsReport),
              hint: "No report uploaded yet",
            },
            {
              id: "review",
              label: "In review",
              value: String(summary.inReview),
              hint: "Awaiting approval",
            },
            {
              id: "approved",
              label: "Approved",
              value: String(summary.approved),
              hint: "Report approved",
            },
            {
              id: "unpaid",
              label: "Unpaid",
              value: String(summary.unpaid),
              hint: "Waiting for payment",
            },
            {
              id: "fees",
              label: "Fees paid",
              value: naira(summary.feesPaid),
              hint: "From paid requests",
            },
          ]}
        />

        <section className="mb-8 flex flex-col gap-4">
          <div className="border-b border-border pb-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Needs your attention
            </h2>
          </div>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {attention.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="flex h-full items-center gap-4 rounded-xl border p-4 transition-shadow hover:shadow-md"
                  style={{
                    backgroundColor: `${item.color}0F`,
                    borderColor: `${item.color}33`,
                  }}
                >
                  <span
                    className="text-3xl font-semibold tabular-nums"
                    style={{ color: item.color }}
                  >
                    {item.count}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">
                      {item.label}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {item.hint}
                    </span>
                  </span>
                  <span aria-hidden className="ml-auto text-muted-foreground">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Recent requests
            </h2>
            <Link
              href="/reva-restricted/dashboard/alluserrequests"
              className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition-shadow hover:shadow-md"
              style={{ background: REVA_GRADIENTS.primary }}
            >
              View all requests →
            </Link>
          </div>
          <RequestList requests={recent} showStats={false} view="grid" />
        </section>
      </div>
    </div>
  );
}
