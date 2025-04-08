"use client";

import { FC, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const ViewDetailsContent: FC = () => {
  const [transactionDetails, setTransactionDetails] = useState({});
  const searchParams = useSearchParams();
  const trxref = searchParams.get("trxref");
  const reference = searchParams.get("reference");

  console.log("Transaction Reference:", trxref);
  console.log("Reference:", reference);

  return (
    <div>
      <h1>Welcome to REVA</h1>
      <h2>Transaction Details</h2>
      <p>Transaction Reference: {trxref}</p>
      <p>Reference: {reference}</p>

      <p>
        Simplify your real estate due diligence process with REVA. Request
        detailed land reports effortlessly and make informed decisions.
      </p>
      <button onClick={() => alert("More details coming soon!")}>
        Learn More
      </button>
    </div>
  );
};

const ViewDetails: FC = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ViewDetailsContent />
    </Suspense>
  );
};

export default ViewDetails;
