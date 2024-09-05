import React from "react";

export const DemystifyingGIS: React.FC = () => {
  return (
    <div className="mywrapper w-full border-4 border-red-500 min-h-[926px] bg-[#f8fafb]">
      <div className="w-full h-full grid grid-cols-1 lg:grid-cols-2 gap-6 justify-items-center lg:justify-items-stretch">
        <div className="basis-1/2 flex-col justify-start items-start gap-[25px] inline-flex">
          <div className="text-[#001f3f] text-[40px] font-bold font-['Bricolage Grotesque']">
            Geospatial Builders Course 1.0
          </div>
          <div className="self-stretch h-[444px] flex-col justify-start items-start gap-6 flex">
            <div className="self-stretch h-[180px] flex-col justify-start items-start gap-2.5 flex">
              <div className="justify-start items-center gap-2.5 inline-flex">
                <div className="text-[#00bfff] text-[32px] font-semibold font-['Bricolage Grotesque']">
                  Theme:
                </div>
              </div>
              <div className="self-stretch text-[#001f3f] text-[55px] font-extrabold font-['Bricolage Grotesque']">
                Demystifying GIS for Surveyors!
              </div>
            </div>
            <div className="self-stretch">
              <span className="text-[#001f3f] text-lg font-normal font-['Bricolage Grotesque'] leading-[30px]">
                An ultra-specific training that will address the current trends,
                development and policies around Surveying and Geospatial space
                that call for a need to be seen as a versatile geospatial
                specialist rather than being confined to the public's view of
                land surveyors, it is imperative to break free from this narrow
                viewpoint. <br />
                <br />
                Historically, this is going to be the first of its kind in the
                survey space in Nigeria.{" "}
              </span>
              <span className="text-[#001f3f] text-lg font-bold font-['Bricolage Grotesque'] leading-[30px]">
                GBC1.0!!!
              </span>
            </div>
          </div>
          <div className="justify-start items-center gap-[29px] inline-flex">
            <div className="w-[78px] flex-col justify-start items-center inline-flex">
              <div className="text-center text-[#001f3f] text-5xl font-semibold font-['Bricolage Grotesque']">
                80
              </div>
              <div className="text-center text-[#001f3f] text-xl font-medium font-['Bricolage Grotesque']">
                Days
              </div>
            </div>
            <div className="text-center text-[#001f3f] text-7xl font-bold font-['Nunito']">
              :
            </div>
            <div className="w-[78px] flex-col justify-start items-center inline-flex">
              <div className="text-center text-[#001f3f] text-5xl font-semibold font-['Bricolage Grotesque']">
                16
              </div>
              <div className="text-center text-[#001f3f] text-xl font-medium font-['Bricolage Grotesque']">
                Hours
              </div>
            </div>
            <div className="text-center text-[#001f3f] text-7xl font-bold font-['Nunito']">
              :
            </div>
            <div className="w-[79px] flex-col justify-start items-center inline-flex">
              <div className="text-center text-[#001f3f] text-5xl font-semibold font-['Bricolage Grotesque']">
                20
              </div>
              <div className="text-center text-[#001f3f] text-xl font-medium font-['Bricolage Grotesque']">
                Mins
              </div>
            </div>
            <div className="text-center text-[#001f3f] text-7xl font-bold font-['Nunito']">
              :
            </div>
            <div className="w-[78px] flex-col justify-start items-center inline-flex">
              <div className="text-center text-[#001f3f] text-5xl font-semibold font-['Bricolage Grotesque']">
                50
              </div>
              <div className="text-center text-[#001f3f] text-xl font-medium font-['Bricolage Grotesque']">
                Secs
              </div>
            </div>
          </div>
          <div className="w-[61.89px] h-[61.89px]" />
          <div className="w-[228px] h-16 px-5 py-[5px] bg-[#001f3f] rounded-[70.74px] shadow justify-center items-center gap-[29.47px] inline-flex">
            <div className="text-white text-2xl font-medium font-['Bricolage Grotesque']">
              Apply Now
            </div>
          </div>
        </div>

        <div className="flex justify-center w-full border-4 border-[#001f3f] basis-1/2">
          <div className="w-[574px] h-[673px] max-w-[574px] max-h-[673px] relative grid grid-cols-1 grid-rows-1 grid ">
            <div className="absolute col-start-1 row-start-1 w-[calc(100% - 30px)] h-full min-h-20 rounded-[10px] border-2 border-[#001f3f] bg-opacity-50 z-10" />
            <img
              className="rounded-[10px] absolute col-start-1 row-start-1 w-full z-20 translate-x-[30px] translate-y-[30px]"
              src="gbc1.0.png"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
