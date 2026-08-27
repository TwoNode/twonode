import React from "react";
import { REVA_COLORS } from "@/reva/colors";

export const ProgressComponent = () => {
  return (
    <div
      className="min-h-[284px] max-w-[670px] p-6 rounded-2xl border flex-col justify-start items-start gap-7 inline-flex"
      style={{
        backgroundColor: REVA_COLORS.background.primary,
        borderColor: REVA_COLORS.border.light,
      }}
    >
      <div
        className="self-stretch text-xl font-bold"
        style={{ color: REVA_COLORS.text.muted }}
      >
        Let's get you started
      </div>
      <div
        className="p-6 w-full gap-2 flex-col flex rounded-lg"
        style={{ backgroundColor: REVA_COLORS.primary.main }}
      >
        {/* <div className="max-w-[637px] w-full h-[77px] relative">
          <div className="w-full h-[77px] left-0 top-0 absolute bg-[#032740] rounded-lg" />
          <div className="w-full h-[15px] left-[24px] top-[41px] absolute bg-[#054674] rounded-lg" />
          </div> */}
        <h4
          className="text-sm font-medium"
          style={{ color: REVA_COLORS.primary.light }}
        >
          0% Complete
        </h4>

        <div
          className="min-w-full rounded-full h-4"
          style={{ backgroundColor: REVA_COLORS.secondary.light }}
        >
          <div
            className="h-4 rounded-full"
            style={{
              width: `${40}%`,
              backgroundColor: REVA_COLORS.primary.light,
            }}
          ></div>
        </div>
      </div>
      <div className="self-stretch justify-start items-center gap-4 inline-flex">
        <div
          className="w-5 h-5 rounded-full border"
          style={{ borderColor: REVA_COLORS.text.muted }}
        />
        <div
          className="text-xl font-bold"
          style={{ color: REVA_COLORS.text.dark }}
        >
          Set up your calendar
        </div>
      </div>
      <div className="self-stretch justify-start items-center gap-4 inline-flex">
        <div
          className="w-5 h-5 rounded-full border"
          style={{ borderColor: REVA_COLORS.text.muted }}
        />
        <div
          className="text-xl font-bold"
          style={{ color: REVA_COLORS.text.dark }}
        >
          Complete your profile
        </div>
      </div>
    </div>
  );
};
