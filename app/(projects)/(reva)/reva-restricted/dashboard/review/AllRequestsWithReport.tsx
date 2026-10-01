import React from "react";
import { getAllRequestsWithUserByAdmin } from "@/reva/services/reportService";
import AllRequestsWithReportClient from "./AllRequestsWithReportClient";

export async function AllRequestsWithReport() {
  try {
    const { properties, oneTimeRequests } = await getAllRequestsWithUserByAdmin({
      onlyWithReport: true,
      includeOneTimeRequests: true,
    });

    return (
      <AllRequestsWithReportClient
        initialData={properties || []}
        initialOneTimeRequests={oneTimeRequests || []}
      />
    );
  } catch {
    return (
      <div className="flex flex-col p-[47px_60px] max-xl:p-[30px_40px] max-lg:p-[15px_30px] max-sm:p-[10px_15px] max-md:p-[10px_20px] max-w-full">
        <div className="text-center py-8 text-red-500">
          <p>Failed to load requests. Please try again.</p>
        </div>
      </div>
    );
  }
}
