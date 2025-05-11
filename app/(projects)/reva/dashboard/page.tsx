import React from "react";
import { Welcome } from "./components/Welcome";
import Link from "next/link";
import { getUserProperties } from "../actions/dbActions";
import UserPropertyRequests from "./components/UserPropertyRequests";

const Home = async () => {
  const { data, success } = await getUserProperties();

  return (
    <div className="flex flex-col p-[47px_60px] max-xl:p-[30px_40px] max-lg:p-[15px_30px] max-sm:p-[10px_15px] max-md:p-[10px_20px] max-w-full">
      <Welcome />

      <div className="propertiesSection mt-8">
        <UserPropertyRequests
          data={data?.slice(0, 1)}
          title={"Recent Requests"}
          smallTitle
        />

        <div className="mt-6 text-center">
          <Link
            href="/reva/dashboard/allrequests"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            View More
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home;
