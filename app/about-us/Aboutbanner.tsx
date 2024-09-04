import React from "react";

const Aboutbanner = () => {
  return (
    <section className="mywrapper w-full min-h-[778px] pl-[135px] bg-white flex-col justify-center items-end gap-2.5 inline-flex">
      <div className="w-full grid gap-5 grid-cols-1 lg:justify-items-center lg:grid-cols-2">
        <div className="flex-col justify-start items-start gap-10 inline-flex">
          <div className="flex-col justify-start items-start gap-5 flex">
            <div className="justify-start items-center gap-[15px] inline-flex">
              <div className="w-5 h-[0px] border-2 border-sky-950"></div>
              <div className="text-zinc-950 text-xl font-medium leading-[34px]">
                About Us
              </div>
            </div>
            <div className="max-w-[670px] w-full text-zinc-950 text-4xl text-center md:text-start md:text-[55px] lg:text-[70px] font-extrabold leading-10 md:leading-[74px]">
              A Revolutionary GIS Solution
            </div>
            <div className="max-w-[570px] text-neutral-600 text-lg font-normal leading-[30px]">
              Revamping the way survey information is managed and retrieved.
              Discover a new level of efficiency and accuracy with our
              cutting-edge technology.
              <br />
              Let us simplify the representation of extent and other vital
              survey details for you. Your ease of access and peace of mind are
              our top priorities.
              <br />
              At TwoNode, we believe that location intelligence is the
              cornerstone of strategic planning and operational efficiency. Our
              team of seasoned GIS professionals and software developers work
              tirelessly to deliver customized solutions that meet the unique
              needs of each client. Whether it's urban planning, environmental
              monitoring, transportation management, or asset tracking, our
              comprehensive suite of GIS services ensures that you have the
              insights you need to succeed.
            </div>
          </div>
        </div>
        <img
          src="/about.png"
          className="max-w-[635px] w-full min-h-[778px] bg-black/opacity-20 rounded-tl-[10px] rounded-bl-[10px]"
        />
      </div>
    </section>
  );
};

export default Aboutbanner;
