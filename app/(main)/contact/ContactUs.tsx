"use client";

export const ContactUs = () => {
  return (
    <div className="mywrapper w-full min-h-[262px] py-[60px] bg-white flex-col justify-center items-center gap-2.5 inline-flex">
      <div className="self-stretch h-[142px] flex-col justify-center items-center gap-[45px] flex">
        <div className="w-full justify-between items-center inline-flex">
          <div className="w-full flex-col justify-start items-center gap-[18px] inline-flex">
            <div className="max-w-[706px] text-center text-zinc-950 text-[40px] lg:text-[35px] md:text-[50px] font-extrabold leading-[45px] md:leading-[64px]">
              Contact Us
            </div>
            <div className="max-w-[982px] text-center text-neutral-600 text-base font-normal leading-[30px]">
              Discover how our innovative GIS solution revolutionizes the
              representation of extent and survey information. Experience
              seamless management and retrieval of Survey Plans like never
              before!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
