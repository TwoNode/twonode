import React from "react";

export const ProgressComponent = () => {
  return (
    <div className="min-h-[284px] max-w-[670px] p-6 bg-white rounded-2xl border border-[#d8dadb] flex-col justify-start items-start gap-7 inline-flex">
      <div className="self-stretch text-[#6d7880] text-xl font-bold">
        Let’s get you started
      </div>
      <div className="p-6 w-full gap-2 flex-col flex bg-[#032740] rounded-lg">
        {/* <div className="max-w-[637px] w-full h-[77px] relative">
          <div className="w-full h-[77px] left-0 top-0 absolute bg-[#032740] rounded-lg" />
          <div className="w-full h-[15px] left-[24px] top-[41px] absolute bg-[#054674] rounded-lg" />
          </div> */}
        <h4 className="text-[#086cb4] text-sm font-medium">
          0% Complete
        </h4>

        <div className="min-w-full bg-[#054674] rounded-full h-4">
          <div
            className="bg-blue-500 h-4 rounded-full"
            style={{ width: `${40}%` }}
          ></div>
        </div>
      </div>
      <div className="self-stretch justify-start items-center gap-4 inline-flex">
        <div className="w-5 h-5 rounded-full border border-[#6d7880]" />
        <div className="text-[#032740] text-xl font-bold">
          Set up your calendar
        </div>
      </div>
      <div className="self-stretch justify-start items-center gap-4 inline-flex">
        <div className="w-5 h-5 rounded-full border border-[#6d7880]" />
        <div className="text-[#032740] text-xl font-bold">
          Complete your profile
        </div>
      </div>
    </div>
  );
};
