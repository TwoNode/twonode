"use client";

import { useState } from "react";

import Link from "next/link";

import "react-responsive-carousel/lib/styles/carousel.min.css"; // requires a loader
import { Carousel } from "react-responsive-carousel";

const GIS = [
  {
    number: 1,
    title: "Survey Data Management",
    desc: "Renders Surveyor's data in a manner that provides easy access, management and data-driven insight.",
    img: "gis.png",
  },
  {
    number: 2,
    title: "Oil and Gas ROW and Utility Asset Network Management",
    desc: "Keep track of all your assets, from pipelines to valve pits, metering stations, place markers, ensuring they are always up-to-date, accurately mapped, and accessible real-time with a mobile app.",
    img: "GIS1.png",
  },
  {
    number: 3,
    title: "Electric Utility Network Management",
    desc: "Visualize your entire electric grid in real-time, allowing for better monitoring and control of your assets.",
    img: "GIS2.png",
  },
  {
    number: 4,
    title: "Telecommunication Asset in Real-Time",
    desc: "Visualize your entire telecommunication asset in real-time, allowing for better monitoring and control of your assets.",
    img: "GIS3.png",
  },
];

export const CarouselImageSlider = ({
  title1 = "Our Core Solution",
  title2 = "Efficient GIS Solutions",
  data = GIS,
  link = { title: "Get Started Today", url: "/services" },
}) => {
  const [element, setElement] = useState({
    number: 1,
    title: "Survey Data Management",
    desc: "Renders Surveyor's data in a manner that provides easy access, management and data-driven insight.",
    img: "gis.png",
  });

  return (
    <div className="mywrapper w-full min-h-[792px] py-[75px] bg-white flex-col items-center gap-12 inline-flex">
      <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-[50px] 2xl:gap-[70px]">
        <div className="lg:basis-1/2 flex flex-col justify-start items-start gap-20">
          <div className="min-h-[172px] flex flex-col justify-start items-start gap-[30px]">
            <div className="flex justify-start items-center gap-[15px]">
              <div className="w-5 h-[0px] border-2 border-sky-950"></div>
              <h2 className="text-sky-950 text-xl font-medium leading-[34px]">
                {title1}
              </h2>
            </div>
            <h3 className="flex flex-col justify-start items-start gap-[18px]">
              <div className="w-[331px] text-sky-950 text-[40px] lg:text-[35px] md:text-[50px] font-extrabold leading-[54px]">
                {title2}
              </div>
            </h3>
          </div>
          <div className="min-h-[110px] w-full flex flex-col justify-start items-start gap-6">
            <div className="max-w-[570px] flex justify-start items-start gap-6">
              <div className="w-16 h-16 rounded-full border-2 border-sky-950 text-center text-sky-950 text-2xl font-bold leading-[34px] grid place-items-center">
                {element.number}
              </div>
              <div className="flex flex-col justify-start items-start gap-5">
                <div className="max-w-[482px] text-sky-950 text-2xl font-bold leading-[34px]">
                  {element.title}
                </div>
                <div className="max-w-[482px] text-neutral-600 text-base font-normal leading-7">
                  {element?.desc}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-start items-start gap-5 w-full">
            <Link
              href={link.url}
              className="w-full self-center max-w-[470px] px-[45px] py-[15px] bg-sky-950 rounded-[30px] flex justify-center items-center gap-2.5"
            >
              <div className="text-center text-white text-lg font-semibold leading-[30px]">
                {link.title}
              </div>
            </Link>
          </div>
        </div>
        <div className="gap-6 lg:basis-1/2 max-h-[642px] flex justify-center items-center">
          <Carousel
            centerMode={true}
            centerSlidePercentage={100}
            showArrows={false}
            showStatus={false}
            showIndicators={false}
            autoPlay={true}
            infiniteLoop
            interval={2000}
            onChange={(ind, item) => setElement(data[ind])}
            onSwipeMove={() => {}}
            showThumbs={false}
            stopOnHover={false}
            swipeable={true}
            className="gap-6 w-full max-w-[530px] max-h-[642px] bg-black/opacity-20 rounded-lg mt-6 lg:mt-0 flex items-center"
          >
            {data.map((item, ind) => (
              <div
                key={ind}
                className="p-6 w-full flex flex-col lg:flex-row lg:items-center lg:justify-center gap-[50px] 2xl:gap-[70px]"
              >
                <img
                  src={item?.img}
                  className="w-full h-auto lg:h-full object-cover rounded-lg"
                  alt="GIS Solutions"
                />
              </div>
            ))}
          </Carousel>
        </div>
      </div>
    </div>
  );
};
