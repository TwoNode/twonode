"use client";

import Link from "next/link";
import { useRef } from "react";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  // CarouselNext,
  // CarouselPrevious,
} from "@/components/ui/carousel";

export const Revolutionizing = () => {
  const plugin = useRef(Autoplay({ delay: 2000, playOnInit: true }));

  const CarouselTexts = ["Revolutionizing", "Revamping", "Transforming"];

  return (
    <section className="RevolutionizingBg mywrapper h-max py-16 bg-black">
      <div className="h-full w-full grid grid-cols-1 lg:grid-cols-2">
        <div className="hidden lg:flex"></div>
        <div className="flex flex-col h-full justify-center">
          <div className="pb-4 justify-start items-center gap-[15px] inline-flex">
            <div className="w-5 h-[0px] border-2 border-white"></div>
            <h2 className="text-white text-xl font-medium leading-[34px]">
              Our Services
            </h2>
          </div>
          <div className="pb-6 items-center inline-flex">
            <div className="flex-col justify-start items-start inline-flex">
              <div className="justify-center items-center inline-flex">
                <div className="text-sky-500 text-[40px] lg:text-[35px] md:text-[50px] font-extrabold leading-[54px]">
                  <Carousel
                    plugins={[plugin.current]}
                    opts={{
                      align: "start",
                    }}
                    orientation="vertical"
                    className="w-full"
                  >
                    <CarouselContent className="h-16">
                      {CarouselTexts.map((text, index) => (
                        <CarouselItem key={index} className="basis-full">
                          {text}
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    {/* <CarouselPrevious />
                      <CarouselNext /> */}
                  </Carousel>
                </div>
              </div>
              <h3 className="self-stretch text-white text-[40px] lg:text-[35px] md:text-[50px] font-extrabold leading-[54px]">
                Industry Based
                <br />
                Geospatial Solutions
              </h3>
            </div>
          </div>
          <div className="pb-10 text-white text-lg font-normal leading-[30px]">
            Discover the art of seamless data management and visualization,
            tailored for your needs. Unleash the power of geospatial
            intelligence with ease.
          </div>

          <Link
            href="/services"
            className="bg-white max-w-[300px] grid place-items-center w-full h-[65px] gap-[10px] rounded-[30px] text-[18px] font-semibold leading-[30px] text-center"
          >
            Learn More
          </Link>
        </div>
      </div>
    </section>
  );
};
