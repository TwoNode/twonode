import React from "react";
import { getAllRequestsWithUserByAdmin } from "@/reva/services/reportService";
import AllRequestsClient from "./AllRequestsClient";

export async function AllRequests() {
  try {
    const { properties, oneTimeRequests } = await getAllRequestsWithUserByAdmin(
      {
        includeOneTimeRequests: true,
      }
    );

    return (
      <AllRequestsClient
        initialData={properties || []}
        initialOneTimeRequests={oneTimeRequests || []}
      />
    );
  } catch {
    return (
      <div className="mx-auto flex flex-col p-6 max-xl:p-[30px_40px] max-lg:p-[15px_30px] max-sm:p-[10px_15px] max-md:p-[10px_20px] max-w-5xl">
        <div className="text-center py-8 text-red-500">
          <p>Failed to load requests. Please try again.</p>
        </div>
      </div>
    );
  }
}
