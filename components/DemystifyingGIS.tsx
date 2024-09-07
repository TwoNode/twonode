import Link from "next/link";
import React from "react";
import { CountdownComponent } from "./CountdownComponent";

export const DemystifyingGIS: React.FC = () => {
  return (
    <div className="mywrapper lg:py-[100px] py-14 w-full min-h-[926px] bg-[#f8fafb]">
      <div className="w-full h-full grid grid-cols-1 lg:grid-cols-2 gap-6 justify-items-center lg:justify-items-stretch">
        <div className="basis-1/2 flex-col justify-start items-start gap-[25px] inline-flex">
          <h2 className="text-[#001f3f] lg:text-[40px] text-[30px] font-bold font-['Bricolage Grotesque']">
            Geospatial Builders Course 1.0
          </h2>
          <div className="self-stretch min-h-[444px] flex-col justify-start items-start gap-6 flex">
            <div className="self-stretch flex-col justify-start items-start gap-2.5 flex">
              <div className="justify-start items-center gap-2.5 inline-flex">
                <h3 className="text-[#00bfff] text-[22px] lg:text-[32px] font-semibold font-['Bricolage Grotesque']">
                  Theme:
                </h3>
              </div>
              <h3 className="self-stretch text-[#001f3f] text-[32px] lg:text-[55px] font-extrabold font-['Bricolage Grotesque']">
                Demystifying GIS for Surveyors!
              </h3>
            </div>
            <div className="self-stretch">
              <p className="text-[#001f3f] lg:text-lg text-sm font-normal font-['Bricolage Grotesque'] leading-[30px]">
                An ultra-specific training that will address the current trends,
                development and policies around Surveying and Geospatial space
                that call for a need to be seen as a versatile geospatial
                specialist rather than being confined to the public's view of
                land surveyors, it is imperative to break free from this narrow
                viewpoint. <br />
                <br />
                Historically, this is going to be the first of its kind in the
                survey space in Nigeria.{" "}
              </p>
              <span className="text-[#001f3f] text-lg font-bold font-['Bricolage Grotesque'] leading-[30px]">
                GBC1.0!!!
              </span>
            </div>
          </div>
       
          <CountdownComponent />
          <Link
            href={"/gbc"}
            className="w-full sm:w-[228px] h-16 bg-[#001f3f] rounded-[70.74px] shadow justify-center items-center flex"
          >
            <span className="text-white text-nowrap text-2xl font-medium font-['Bricolage Grotesque']">
              Apply Now
            </span>
          </Link>
        </div>

        <div className="p-3 flex justify-center w-full basis-1/2">
          <div className="h-max w-full flex justify-center max-w-[574px] max-h-[673px] relative">
            <div className="w-[85%] col-start-1 row-start-1 h-full min-h-20 rounded-[10px] border-2 border-[#001f3f] bg-opacity-50 z-10">
              <img
                className="rounded-[10px] col-start-1 row-start-1 w-full z-20 translate-x-[30px] translate-y-[30px]"
                src="gbc1.0.png"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
