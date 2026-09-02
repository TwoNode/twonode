import React from "react";
import { getServerSession } from "@/lib/auth/session";
import { getUserProperties } from "@/reva/services/propertyRequestService";
import { Platform } from "@/utils/platform";
import DashboardClient from "./DashboardClient";
import ErrorComponent from "./components/ErrorComponent";

const Home = async () => {
  const session = await getServerSession(Platform.REVA);
  if (!session) {
    return <ErrorComponent />;
  }

  const data = await getUserProperties(session.sub);

  return <DashboardClient initialData={data} />;
};

export default Home;
