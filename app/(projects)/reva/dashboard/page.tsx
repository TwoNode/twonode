import React from "react";
import { getUserProperties } from "../actions/revaActions";
import DashboardClient from "./DashboardClient";
import ErrorComponent from "./components/ErrorComponent";

const Home = async () => {
  const { data, success } = await getUserProperties();

  if (!success) {
    return <ErrorComponent />;
  }

  return <DashboardClient initialData={data || []} />;
};

export default Home;
