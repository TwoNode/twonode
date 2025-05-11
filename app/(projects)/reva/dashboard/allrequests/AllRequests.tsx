import React from "react";
import { getUserProperties } from "../../actions/dbActions";
import Link from "next/link";
import UserPropertyRequests from "../components/UserPropertyRequests";
// import { SingleRequest } from "../components/SingleRequest";

export async function AllRequests() {
  const { data, success } = await getUserProperties();

  console.log("\n\n\n\n\n\n", success, data, "\n\n\n\n\n\n\n");

  return (
    <div className="flex flex-col p-[47px_60px] max-xl:p-[30px_40px] max-lg:p-[15px_30px] max-sm:p-[10px_15px] max-md:p-[10px_20px] max-w-full">
      <UserPropertyRequests data={data} />
    </div>
  );
}
