import React from "react";
import { getAllRequestsWithUserByAdmin } from "../../actions/adminDbActions";
import AllRequestsClient from "./AllRequestsClient";

export async function AllRequests() {
  const { data, success, oneTimeRequests } =
    await getAllRequestsWithUserByAdmin({ includeOneTimeRequests: true });

  if (!success) {
    return (
      <div className="mx-auto flex flex-col p-6 max-xl:p-[30px_40px] max-lg:p-[15px_30px] max-sm:p-[10px_15px] max-md:p-[10px_20px] max-w-5xl">
        <div className="text-center py-8 text-red-500">
          <p>Failed to load requests. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <AllRequestsClient
      initialData={data || []}
      initialOneTimeRequests={oneTimeRequests || []}
    />
  );
}
