import React from "react";
import { getOneTimeRequestByReference } from "@/reva/services/propertyRequestService";
import { OneTimeRequest } from "./OneTimeRequest";
import { OneTimeRequestLookup } from "./OneTimeRequestLookup";

interface PageProps {
  searchParams: Promise<{
    reference?: string;
    email?: string;
  }>;
}

export default async function OneTimeRequestPage({ searchParams }: PageProps) {
  const { reference, email } = await searchParams;

  if (!reference || !email) {
    return <OneTimeRequestLookup />;
  }

  let request;
  try {
    request = await getOneTimeRequestByReference(reference, email);
    if (!request) {
      return (
        <OneTimeRequestLookup
          initialReference={reference}
          initialEmail={email}
          errorMessage={`No request found for reference "${reference}" and email "${email}". Please verify your credentials or contact support.`}
        />
      );
    }
  } catch {
    return (
      <OneTimeRequestLookup
        initialReference={reference}
        initialEmail={email}
        errorMessage={`Unable to locate your request. Please verify reference "${reference}" and email "${email}", or contact support if you believe this is an error.`}
      />
    );
  }

  return <OneTimeRequest data={request} />;
}
