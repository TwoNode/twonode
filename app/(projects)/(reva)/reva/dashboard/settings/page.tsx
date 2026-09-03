import React from "react";
import { getAuthenticatedRevaUser } from "@/reva/utils/revaAuth";
import UserProfile from "./UserProfile";

const Settings = async () => {
  try {
    const user = await getAuthenticatedRevaUser();

    return (
      <div className="flex flex-col p-[47px_60px] max-xl:p-[30px_40px] max-lg:p-[15px_30px] max-sm:p-[10px_15px] max-md:p-[10px_20px] max-w-full">
        <UserProfile user={user} />
      </div>
    );
  } catch (error) {
    return (
      <div className="flex flex-col p-[47px_60px] max-xl:p-[30px_40px] max-lg:p-[15px_30px] max-sm:p-[10px_15px] max-md:p-[10px_20px] max-w-full">
        <div className="text-center py-8 text-red-500">
          <p>Failed to load profile. Please try again.</p>
        </div>
      </div>
    );
  }
};

export default Settings;
