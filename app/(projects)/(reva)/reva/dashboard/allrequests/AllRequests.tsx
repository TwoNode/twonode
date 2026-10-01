import React from "react";
import { getServerSession } from "@/lib/auth/session";
import { getUserProperties } from "@/reva/services/propertyRequestService";
import { Platform } from "@/utils/platform";
import AllRequestsClient from "./AllRequestsClient";
import ErrorComponent from "../components/ErrorComponent";

export async function AllRequests() {
  const session = await getServerSession(Platform.REVA);
  if (!session) {
    return <ErrorComponent />;
  }

  const data = await getUserProperties(session.sub);

  return <AllRequestsClient initialData={data} />;
}
