import React from "react";
import { getAllRequestsWithUser } from "../../actions/adminDbActions";
import Link from "next/link";
import RequestList from "../../components/RequestsList";

export async function AllRequests() {
  const { data, success } = await getAllRequestsWithUser();

  return (
    <div className="flex flex-col p-[47px_60px] max-xl:p-[30px_40px] max-lg:p-[15px_30px] max-sm:p-[10px_15px] max-md:p-[10px_20px] max-w-full">
      <h1 className="text-2xl font-bold mb-4">
        All Requests &nbsp; <small> ( {success && data?.length} )</small>
      </h1>

      <section className="info-section mb-6 flex flex-col gap-4">
        {success && data ? (
          <>
            <RequestList requests={data || []} />
          </>
        ) : (
          <p>No properties found.</p>
        )}
      </section>
    </div>
  );
}
