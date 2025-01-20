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
            <div className="max-w-[670px] w-full text-zinc-950 text-3xl text-center md:text-start md:text-[40px] lg:text-[50px] font-extrabold leading-10 md:leading-[74px]">
              TwoNode Technologies
            </div>
            <div className="max-w-[570px] text-neutral-600 text-lg font-normal leading-[30px]">
              TwoNode Technologies is a pioneering geospatial innovation company
              focused on redefining the management, analysis, and visualization
              of geospatial data. With a commitment to excellence, we provide
              state-of-the-art Industry based GIS solutions that empower
              industries to optimize their operations through actionable
              geospatial insights. Our expertise spans various sectors,
              including oil and gas, real estate, E-Health, urban planning,
              telecommunications, energy, and surveying.
              <br />
              At TwoNode Technologies, we tackle the challenges faced by
              industry professionals in accessing and managing geospatial data.
              By leveraging advanced technologies and innovative practices, we
              transform raw data into structured and accessible databases,
              enabling seamless data retrieval, visualization, and informed
              decision-making
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center">
          <img
            src="/about.jpeg"
            className="max-w-[635px] w-full max-h-[778px] bg-black/opacity-20 rounded-tl-[10px] rounded-bl-[10px]"
          />
        </div>
      </div>
    </section>
  );
};

export default Aboutbanner;
