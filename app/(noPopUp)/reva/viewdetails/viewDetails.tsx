"use client";

import { Metadata } from "next";
import { FC } from "react";

const ViewDetails: FC = () => {
  return (
    <div>
      <h1>Welcome to REVA</h1>
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
