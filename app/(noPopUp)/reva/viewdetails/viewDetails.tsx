"use client";

import { Metadata } from "next";
import { FC, useState } from "react";
import { useSearchParams } from "next/navigation";

const ViewDetails: FC = () => {
  const [transactionDetails, setTransactionDetails] = useState({});
  const searchParams = useSearchParams();
  const trxref = searchParams.get("trxref");
  const reference = searchParams.get("reference");

  console.log("Transaction Reference:", trxref);
  console.log("Reference:", reference);
  // You can use trxref and reference to fetch transaction details or perform any other actions
  // For example, you might want to verify the transaction with your backend
  // or display a success message to the user.
  // You can also use a state management library or context to manage the transaction state
  // and display it in your component.

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

export default ViewDetails;
