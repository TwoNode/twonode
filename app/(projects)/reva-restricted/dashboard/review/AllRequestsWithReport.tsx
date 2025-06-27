import React from "react";
import { getAllRequestsWithUserByAdmin } from "../../actions/adminDbActions";
import AllRequestsWithReportClient from "./AllRequestsWithReportClient";

export async function AllRequestsWithReport() {
  const { data, success, oneTimeRequests } =
    await getAllRequestsWithUserByAdmin({
      onlyWithReport: true,
      includeOneTimeRequests: true,
    });

  if (!success) {
    return (
      <div className="flex flex-col p-[47px_60px] max-xl:p-[30px_40px] max-lg:p-[15px_30px] max-sm:p-[10px_15px] max-md:p-[10px_20px] max-w-full">
        <div className="text-center py-8 text-red-500">
          <p>Failed to load requests. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <AllRequestsWithReportClient
      initialData={data || []}
      initialOneTimeRequests={oneTimeRequests || []}
    />
  );
}
