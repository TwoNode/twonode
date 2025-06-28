import React from "react";
import { getUserProperties } from "../../actions/dbActions";
import AllRequestsClient from "./AllRequestsClient";
import ErrorComponent from "../components/ErrorComponent";

export async function AllRequests() {
  const { data, success } = await getUserProperties();

  if (!success) {
    return <ErrorComponent />;
  }

  return <AllRequestsClient initialData={data || []} />;
}
