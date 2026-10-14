import React from "react";
import {
  getAdminRequestSummaryRows,
  getAllRequestsWithUserByAdmin,
} from "@/reva/services/reportService";
import ErrorComponent from "../../reva/dashboard/components/ErrorComponent";
import { AdminHomeOverview } from "../components/AdminHomeOverview";
import type { summarizeRequests } from "../components/requestStats";

type Rows = Parameters<typeof summarizeRequests>[0];

const Home = async () => {
  let recent, rows;
  try {
    const [latest, summaryRows] = await Promise.all([
      getAllRequestsWithUserByAdmin({
        limit: 6,
        includeOneTimeRequests: true,
      }),
      getAdminRequestSummaryRows(),
    ]);
    // The six most recently active requests, whichever kind.
    recent = [...latest.properties, ...(latest.oneTimeRequests ?? [])]
      .sort(
        (a, b) =>
          new Date(b.updatedAt ?? b.createdAt).getTime() -
          new Date(a.updatedAt ?? a.createdAt).getTime()
      )
      .slice(0, 6);
    rows = summaryRows;
  } catch {
    return <ErrorComponent />;
  }

  return (
    <AdminHomeOverview
      oneTimeRows={rows.oneTime as Rows}
      propertyRows={rows.properties as Rows}
      recent={recent}
    />
  );
};

export default Home;
