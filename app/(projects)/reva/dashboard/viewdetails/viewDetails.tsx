"use client";

import { FC, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { removeIdPrefix } from "@/utils/removeIDFromParcel";

const ViewDetailsContent = ({ formData }: { formData: any }) => {
  const router = useRouter();

  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");

  console.log("Reference:", reference);

  const username =
    (formData?.firstName || "") + " " + (formData?.lastName || "") ||
    (formData?.givenName || "") + " " + (formData?.familyName || "");

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="bg-white shadow-2xl rounded-2xl p-10 w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-green-700 text-center mb-6">
          Due Diligence Request Successful
        </h1>

        <p className="text-center text-gray-600 mb-6">
          Thank you for your due diligence request.
          <br />
          Your REVA transaction reference is:
        </p>

        <div className="text-center text-blue-600 font-semibold text-lg mb-6">
          {/* Transaction Ref: <span>{trxref}</span> */}
          Reference: <span>{reference}</span>
        </div>

        <div className="space-y-4">
          <Detail label="Email" value={formData?.email} />
          <Detail label="Status" value={formData?.status} />
          <Detail label="Payment Status" value={formData?.paymentStatus} />
          <Detail label="Property Address" value={formData?.address} />
          <Detail
            label="Location"
            value={`${formData?.lat}, ${formData?.lng}`}
          />
          <Detail
            label="Parcel ID"
            value={removeIdPrefix(formData?.parcelId)}
          />
          <Detail label="LGA" value={formData?.lga} />
          <Detail
            label="Total Cost"
            value={formData?.totalCost?.toLocaleString("en-NG", {
              style: "currency",
              currency: "NGN",
            })}
          />
          {formData?.comments && (
            <Detail label="Comments" value={formData?.comments} />
          )}
        </div>

        <div className="mt-8 text-center flex justify-center flex-wrap gap-5">
          <Button
            className="bg-blue-600 text-white py-3 px-6 rounded-lg shadow-md hover:bg-blue-700"
            onClick={() => router.push("/reva/dashboard/newrequest")}
          >
            New Request
          </Button>

          <Button
            variant={"link"}
            className="bg-transparent border-2 border-blue-600 text-blue-600 py-3 px-6 rounded-lg shadow-md hover:bg-blue-600 hover:text-white"
            onClick={() => router.push("/reva/dashboard/allrequests")}
          >
            All Request
          </Button>

          {formData.paymentStatus !== "Successful" ? (
            <>
              <Button
                variant={"outline"}
                className="bg-green-600 text-white py-3 px-6 rounded-lg shadow-md hover:bg-blue-700"
                onClick={() =>
                  router.push(
                    `/reva/dashboard/newrequest?reference=${reference}`
                  )
                }
              >
                Continue Request
              </Button>
            </>
          ) : (
            ""
          )}
        </div>
      </div>
    </div>
  );
};

const ViewDetails = ({ formData }: { formData: any }) => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <>
        <ViewDetailsContent formData={formData} />
      </>
    </Suspense>
  );
};

export default ViewDetails;

const Detail = ({ label = "", value = "" }) => (
  <div className="flex justify-between items-center border-b pb-2">
    <span className="text-gray-600 font-medium">{label}:</span>
    <span className="text-gray-800 font-semibold text-right ml-4 max-w-[60%] truncate">
      {value}
    </span>
  </div>
);
