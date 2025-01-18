import React from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Link from "next/link";

// Define the props type
interface SignUpforOurSurveyProps {
  url?: string; // 'url' is an optional string prop
}

// Define the component using the props type
export const SignUpforOurSurvey: React.FC<SignUpforOurSurveyProps> = ({
  url = "/login",
}) => {
  return (
    <div className="mywrapper w-full min-h-[374px] pt-[60px] pb-24 bg-white flex-col justify-center items-center gap-2.5 inline-flex">
      <div className="self-stretch min-h-[254px] flex-col justify-start items-center gap-[45px] flex">
        <div className="w-full justify-between items-center inline-flex">
          <div className="w-full flex-col justify-start items-center gap-[18px] inline-flex">
            <h2 className="text-center text-sky-950 text-[35px] md:text-[50px] font-extrabold leading-[45px] md:leading-[64px]">
              Sign Up for Our Survey Data Management
            </h2>
            <div className="w-[90%] text-center text-sky-950 text-base font-normal leading-[30px]">
              Don't miss out on the latest in GIS technology and insights.
              Subscribe to our newsletter and be the first to know about new
              features, industry trends, and expert tips.
            </div>
          </div>
        </div>
        <Link
          target="_blank"
          href={url}
          className="max-w-[257px] w-full px-5 py-6 grid place-items-center bg-sky-950 rounded-[50px]"
        >
          <div className="text-white text-lg font-semibold">Subscribe</div>
        </Link>
      </div>
    </div>
  );
};

export const BelovedClientsSayings = () => {
  const testimonials = [
    {
      imgSrc: "/saying1.png",
      text: "I am truly impressed by TwoNode Technologies' innovative GIS solution. It is a game-changer in the industry, offering new ways to access and manage survey-based data anywhere in the world.",
      author: "Surv. Adebule Mariam - FOMSSURVEY",
    },
    {
      imgSrc: "saying2.png",
      text: "It's truly wonderful to come across a solution that efficiently and effectively addresses the challenges we face. The convenience of storing and retrieving our records in a well-organized system is truly unmatched.",
      author: "Karimah Dolapo - STENIK CONSULT",
    },
    {
      imgSrc: "saying3.png",
      text: "I have always seen GIS as a fantasy but here we are a company really using GIS to solve the problem of Survey Based Data Management.",
      author: "Aderayo - DOT POINTS",
    },
  ];

  return (
    <div className="mywrapper belovedClientBg bg-black w-full py-16 min-h-[592px] flex-col justify-start items-center gap-[70px] inline-flex">
      <div className="text-center text-white text-[35px] md:text-[50px] font-extrabold leading-[54px]">
        What Our Beloved Clients Are Saying
      </div>

      <div className="flex w-full justify-center overflow-hidden items-start gap-[30px]">
        <Carousel className="w-full">
          <CarouselContent className="flex gap-7">
            {testimonials.map((testimonial, index) => (
              <CarouselItem
                key={index}
                className="p-3 basis-full md:basis-1/2 2xl:basis-1/3"
              >
                <div className="w-full flex justify-center">
                  <div className="px-5 py-10 bg-white rounded-[10px] flex-col justify-start items-start gap-2.5 inline-flex">
                    <div className="flex-col justify-start items-center gap-5 flex">
                      <img
                        className="w-[72px] h-[72px] rounded-full border border-sky-950"
                        src={testimonial.imgSrc}
                        alt={`Testimonial from ${testimonial.author}`}
                      />
                      <div className="flex-col justify-center items-center gap-2.5 flex">
                        <div className="justify-start items-center gap-1 inline-flex" />
                        <div className="w-[330px] text-center text-neutral-600 text-base font-normal leading-7">
                          {testimonial.text}
                        </div>
                      </div>
                      <div className="text-center text-sky-950 text-base font-medium leading-7">
                        {testimonial.author}
                      </div>
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
  );
};

export const FeaturedNews = () => {
  return (
    <div className="mywrapper w-full min-h-[623px] px-[135px] py-[70px] bg-gray-50 flex-col justify-start items-start gap-2.5 inline-flex">
      <div className="self-stretch min-h-[483px] flex-col justify-start items-start gap-[50px] flex">
        <h2 className="self-stretch text-neutral-900 text-5xl font-semibold capitalize">
          Featured News
        </h2>
        <div className="grid justify-items-center lg:grid-cols-2 gap-10">
          <img
            className="max-w-[565px] w-full max-h-[390px] rounded-[10px]"
            src="/gbc/website/img_11.jpg"
          />
          <div className="self-stretch flex-col justify-start items-start gap-[45px] inline-flex">
            <div className="self-stretch min-h-[260px] flex-col justify-start items-start gap-[30px] flex">
              <div className="self-stretch text-neutral-900 text-xl font-medium leading-[35px]">
                {/* Same Subscription with more Capabilities with ArcGIS Pro and
                ArcOnline Licenses */}
                GBC 1.0: Demystifying GIS for Surveyors
              </div>
              <div className="self-stretch text-neutral-900 text-base font-normal leading-[30px]">
                {/* TwoNode Technologies is thrilled to announce a long-term
                partnership with sambus geospatial, the official distributor for
                ESRI products. */}
                <b> On November 23, 2024,</b> at the Marriott Hotel in Ikeja,
                Lagos, GBC 1.0 brought surveyors together to explore how GIS can
                revolutionize their profession. With the theme "Demystifying GIS
                for Surveyors," the event highlighted the growing need for
                remote access services and a shift toward digital innovation.
                {/* This partnership is to provide ultra-specific capabilities
                beyond your imagination. */}
                <span className="mt-4 block">
                  <b>The program </b> showcased how GIS serves as a powerful
                  ally, enhancing workflows from fieldwork to plan management,
                  and empowering surveyors to lead in today’s dynamic, digital
                  age.
                </span>
                <span className="mt-4 block">
                  <b>Discover </b> the insights, breakthroughs, and highlights
                  of this groundbreaking event.
                </span>
              </div>
            </div>
            <Link
              href={"/featurednews"}
              className="px-5 py-2.5 bg-sky-950 rounded-[5px] justify-center items-center gap-2.5 inline-flex"
            >
              <div className="text-white text-lg font-normal leading-7">
                Read More
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
