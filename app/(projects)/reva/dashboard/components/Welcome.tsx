import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import React from "react";

export async function Welcome() {
  const { getUser } = getKindeServerSession();

  const user: any = await getUser();
  const userName = user?.given_name! || user?.family_name! || "User";
  console.log("user", user);

  return (
    <div className="flex justify-between max-lg:gap-6 gap-8 max-lg:flex-col mb-32 max-w-full">
      <div className="flex flex-1 flex-col gap-8">
        <div className="flex flex-1 flex-col">
          <h1>
            <span className="text-[#032740] max-lg:text-xl text-[32px] font-bold">
              Welcome,
            </span>
            <span className="text-[#032740] max-lg:text-xl text-[32px] font-normal font-['Times New Roman']">
              {" "}
              {userName}
            </span>
          </h1>

          <p className="text-[#032740] text-base font-medium">
            Hope you are having a great day!{" "}
          </p>
        </div>
        <div className="flex flex-1 flex-col gap-6 p-4 bg-[#f9fafb] rounded-lg shadow-md">
          <p className="text-[#032740] text-base font-medium leading-relaxed">
            Start by requesting a report or reviewing your previous reports to
            stay on top of your progress.
          </p>
          <p className="text-[#032740] text-base font-medium leading-relaxed">
            Have questions? Our team is here to help—don’t hesitate to reach
            out!
          </p>
        </div>
      </div>
    </div>
  );
}
