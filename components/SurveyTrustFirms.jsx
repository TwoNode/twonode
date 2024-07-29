"use client";

import { useRef } from "react";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export const SurveyTrustFirms = () => {
  const plugin = useRef(Autoplay({ delay: 2000, playOnInit: true }));

  const surveyData = [
    {
      src: "/surveyfoms.png",
      companyName: "FOMS Survey Consult Limited",
      surveyor: "Surv. Mariam Adebule",
      imgWidth: 204,
      imgHeight: 83,
    },
    {
      src: "stenik.png",
      companyName: "Stenik Consult",
      surveyor: "Surv. Adenike A. Tejuosho",
      imgWidth: 203,
      imgHeight: 84,
    },
    {
      src: "arpenture.png",
      companyName: "Arpenture Consultants Limited",
      surveyor: "Surv. Adedapo Fashina",
      imgWidth: 203,
      imgHeight: 79,
    },
    {
      src: "samday.png",
      companyName: "Samday GeoServices",
      surveyor: "Surv. Adediji Adegoke Samson",
      imgWidth: 155,
      imgHeight: 80,
    },
    {
      src: "QED.png",
      companyName: "QED Consult",
      surveyor: "Surv. Sangowawa Olutomi Ajose",
      imgWidth: 152,
      imgHeight: 80,
    },
    {
      src: "DOTPoint.png",
      companyName: "DOT Point",
      surveyor: "Surv. Taiwo David O.",
      imgWidth: 99,
      imgHeight: 80,
    },
    {
      src: "SurveyFirm.png",
      companyName: "Survey Firm",
      surveyor: "Surv. Paul Osigweh Chigozie",
      imgWidth: 99,
      imgHeight: 80,
    },
    {
      src: "/surveyfoms.png",
      companyName: "FOMS Survey Consult Limited",
      surveyor: "Surv. Mariam Adebule",
      imgWidth: 204,
      imgHeight: 83,
    },
    {
      src: "stenik.png",
      companyName: "Stenik Consult",
      surveyor: "Surv. Adenike A. Tejuosho",
      imgWidth: 203,
      imgHeight: 84,
    },
    {
      src: "arpenture.png",
      companyName: "Arpenture Consultants Limited",
      surveyor: "Surv. Adedapo Fashina",
      imgWidth: 203,
      imgHeight: 79,
    },
    {
      src: "samday.png",
      companyName: "Samday GeoServices",
      surveyor: "Surv. Adediji Adegoke Samson",
      imgWidth: 155,
      imgHeight: 80,
    },
    {
      src: "QED.png",
      companyName: "QED Consult",
      surveyor: "Surv. Sangowawa Olutomi Ajose",
      imgWidth: 152,
      imgHeight: 80,
    },
    {
      src: "DOTPoint.png",
      companyName: "DOT Point",
      surveyor: "Surv. Taiwo David O.",
      imgWidth: 99,
      imgHeight: 80,
    },
    {
      src: "SurveyFirm.png",
      companyName: "Survey Firm",
      surveyor: "Surv. Paul Osigweh Chigozie",
      imgWidth: 99,
      imgHeight: 80,
    },
    {
      src: "/surveyfoms.png",
      companyName: "FOMS Survey Consult Limited",
      surveyor: "Surv. Mariam Adebule",
      imgWidth: 204,
      imgHeight: 83,
    },
    {
      src: "stenik.png",
      companyName: "Stenik Consult",
      surveyor: "Surv. Adenike A. Tejuosho",
      imgWidth: 203,
      imgHeight: 84,
    },
    {
      src: "arpenture.png",
      companyName: "Arpenture Consultants Limited",
      surveyor: "Surv. Adedapo Fashina",
      imgWidth: 203,
      imgHeight: 79,
    },
    {
      src: "samday.png",
      companyName: "Samday GeoServices",
      surveyor: "Surv. Adediji Adegoke Samson",
      imgWidth: 155,
      imgHeight: 80,
    },
    {
      src: "QED.png",
      companyName: "QED Consult",
      surveyor: "Surv. Sangowawa Olutomi Ajose",
      imgWidth: 152,
      imgHeight: 80,
    },
    {
      src: "DOTPoint.png",
      companyName: "DOT Point",
      surveyor: "Surv. Taiwo David O.",
      imgWidth: 99,
      imgHeight: 80,
    },
    {
      src: "SurveyFirm.png",
      companyName: "Survey Firm",
      surveyor: "Surv. Paul Osigweh Chigozie",
      imgWidth: 99,
      imgHeight: 80,
    },
  ];

  return (
    <div className="overflow-hidden max-w-full">
      <div className="w-full h-[276px] py-10 items-center  bg-white self-stretch flex-col justify-start gap-[35px] flex">
        <div className="text-center text-stone-950 text-lg font-semibold">
          Survey Firms that Trust our Solution
        </div>
        <div className="flex w-full justify-center overflow-hidden items-center">
          <Carousel
            plugins={[plugin.current]}
            // onMouseEnter={plugin.current.stop}
            // onMouseLeave={plugin.current.reset}
            className="w-[90%]"
            style={{ width: "95%" }}
          >
            <CarouselContent className="flex p-3">
              {surveyData.map((survey, index) => (
                <CarouselItem
                  key={index}
                  className="p-2 basis-1/2 md:basis-[35%] lg:basis-[20%] 2xl:basis-[14%]"
                >
                  <div className="flex-col justify-start items-center gap-2.5 inline-flex">
                    <img
                      className={`w-[${survey.imgWidth}px] h-[${survey.imgHeight}px]`}
                      src={survey.src}
                      alt={survey.companyName}
                    />
                    <div className="flex-col justify-start items-center flex">
                      <div className="text-center text-stone-950 text-sm font-medium">
                        {survey.companyName}
                      </div>
                      <div className="text-center text-stone-950 text-xs font-normal leading-7">
                        {survey.surveyor}
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      </div>
    </div>
  );
};
