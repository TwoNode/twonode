import React from "react";
import { getAllRequestsWithUserByAdmin } from "../../actions/adminDbActions";
import Link from "next/link";
import RequestList from "../../components/RequestsList";
import { AdminMiniHeader } from "../../components/AdminMiniHeader";

export async function AllRequestsWithReport() {
  const { data, success, oneTimeRequests } =
    await getAllRequestsWithUserByAdmin({
      onlyWithReport: true,
    });

  return (
    <div className="flex flex-col p-[47px_60px] max-xl:p-[30px_40px] max-lg:p-[15px_30px] max-sm:p-[10px_15px] max-md:p-[10px_20px] max-w-full">
      {success && oneTimeRequests && oneTimeRequests?.length > 0 && (
        <section>
          <AdminMiniHeader
            title={
              <>
                OneTime Requests with Report &nbsp;{" "}
                <small> ( {success && oneTimeRequests?.length} )</small>
              </>
            }
          />

          {success && data ? (
            <>
              <RequestList requests={oneTimeRequests || []} />
            </>
          ) : (
            <p>No properties found.</p>
          )}
        </section>
      )}

      <section className="info-section mb-6 flex flex-col gap-4">
        <AdminMiniHeader
          title={
            <>
              All Requests with Report &nbsp;{" "}
              <small> ( {success && data?.length} )</small>
            </>
          }
        />

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
