"use client";

import React, { FC } from "react";
import { motion } from "framer-motion";
import RevaHeroSection from "./RevaHeroSection";
import RevaFooterSection from "./RevaFooterSection";

import "react-responsive-carousel/lib/styles/carousel.min.css"; // requires a loader
import { Carousel } from "react-responsive-carousel";
import { REVA_COLORS, REVA_GRADIENTS } from "@/reva/colors";

const RevaLandingPage: FC = () => {
  const coreFeatures: string[] = [
    "Property Search",
    "Due Diligence Report",
    "Title Verification",
    "Survey Analysis",
    "Risk Assessment",
  ];

  interface Step {
    title: string;
    desc: string;
  }

  const howItWorks: Step[] = [
    {
      title: "Submit Request",
      desc: "Fill out the property details form with location and requirements.",
    },
    {
      title: "Processing",
      desc: "Our team analyzes the property and gathers comprehensive data.",
    },
    {
      title: "Receive Report",
      desc: "Download a detailed due diligence report.",
    },
  ];

  const reportPreview: any[] = [
    {
      number: 1,
      title: "Survey Data Management",
      desc: "Renders Surveyor's data in a manner that provides easy access, management and data-driven insight.",
      img: "reva/preview/reva1.jpg",
    },
    {
      number: 2,
      title: "Oil and Gas ROW and Utility Asset Network Management",
      desc: "Keep track of all your assets, from pipelines to valve pits, metering stations, place markers, ensuring they are always up-to-date, accurately mapped, and accessible real-time with a mobile app.",
      img: "reva/preview/reva2.jpg",
    },
    {
      number: 3,
      title: "Electric Utility Network Management",
      desc: "Visualize your entire electric grid in real-time, allowing for better monitoring and control of your assets.",
      img: "reva/preview/reva3.jpg",
    },
    {
      number: 4,
      title: "Telecommunication Asset in Real-Time",
      desc: "Visualize your entire telecommunication asset in real-time, allowing for better monitoring and control of your assets.",
      img: "reva/preview/reva4.jpg",
    },
    {
      number: 5,
      title: "Electric Utility Network Management",
      desc: "Visualize your entire electric grid in real-time, allowing for better monitoring and control of your assets.",
      img: "reva/preview/reva5.jpg",
    },
    {
      number: 6,
      title: "Telecommunication Asset in Real-Time",
      desc: "Visualize your entire telecommunication asset in real-time, allowing for better monitoring and control of your assets.",
      img: "reva/preview/reva6.jpg",
    },
  ];

  return (
    <div>
      <RevaHeroSection />

      {/* About Section */}
      <section
        className="py-20 px-5 text-center"
        style={{
          background: `linear-gradient(to right, ${REVA_COLORS.background.tertiary}, ${REVA_COLORS.gray[100]})`,
          color: REVA_COLORS.text.dark,
        }}
      >
        <h2
          className="text-4xl font-extrabold mb-10"
          style={{ color: REVA_COLORS.text.dark }}
        >
          About REVA
        </h2>

        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center md:items-start">
          <div className="md:w-1/2 px-6 md:px-12">
            <p
              className="text-lg p-5 leading-relaxed text-justify"
              style={{ color: REVA_COLORS.text.secondary }}
            >
              REVA is a cutting-edge digital platform designed to simplify real
              estate due diligence. By providing structured and detailed reports
              on land parcels, REVA empowers users to make informed decisions
              without requiring GIS expertise. Experience seamless transactions
              and trusted due diligence insights with just a few clicks.
            </p>
          </div>

          <div className="md:mt-0 md:w-1/2 flex justify-center">
            <motion.img
              src="/reva/revaLogo.png"
              alt="About REVA"
              className="w-80 md:w-96"
              animate={{ opacity: 1, scale: 1 }}
              initial={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </section>

      {/* Why Us Section */}
      <section
        className="py-20 text-center"
        style={{
          backgroundColor: REVA_COLORS.background.tertiary,
          color: REVA_COLORS.text.dark,
        }}
      >
        <h2 className="text-4xl font-semibold">Why Choose REVA?</h2>
        <div className="flex flex-wrap justify-center gap-6 mt-10 px-10">
          {[
            "Comprehensive due diligence insights",
            "Title Search",
            "Charting Information",
            "Historical Survey Record",
            "Map of the property",
          ].map((reason, index) => (
            <motion.div
              key={index}
              className="p-6 rounded-xl shadow-md w-64 text-center"
              style={{ backgroundColor: REVA_COLORS.background.secondary }}
              animate={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4, delay: index * 0.2 }}
            >
              <p className="text-lg font-medium">{reason}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Core Features */}
      <section
        className="py-20"
        style={{
          backgroundColor: REVA_COLORS.background.tertiary,
          color: REVA_COLORS.text.dark,
        }}
      >
        <h2 className="text-4xl font-semibold text-center">Core Features</h2>
        <div className="flex flex-wrap justify-center gap-6 mt-10 px-10">
          {coreFeatures.map((feature, index) => (
            <motion.div
              key={index}
              className="p-6 rounded-xl shadow-md w-64 text-center hover:shadow-lg hover:scale-105 transition-transform duration-300"
              style={{ backgroundColor: REVA_COLORS.background.secondary }}
              animate={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4, delay: index * 0.2 }}
            >
              <p className="text-lg font-mediumn">{feature}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section
        className="py-20"
        style={{
          backgroundColor: REVA_COLORS.background.secondary,
          color: REVA_COLORS.text.dark,
        }}
      >
        <h2 className="text-4xl font-semibold text-center">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mt-12 px-12">
          {howItWorks.map((step, index) => (
            <motion.div
              key={index}
              className="p-8 border rounded-xl text-center shadow-lg hover:shadow-2xl transition-all"
              style={{
                backgroundColor: REVA_COLORS.background.tertiary,
                borderColor: REVA_COLORS.border.light,
              }}
              animate={{ opacity: 1, scale: 1 }}
              initial={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
            >
              <h3 className="text-2xl font-semibold">Step {index + 1}</h3>
              <p className="mt-2 text-lg">{step.title}</p>
              <p className="mt-2" style={{ color: REVA_COLORS.text.muted }}>
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      <div
        className="p-10 text-white"
        style={{ background: REVA_GRADIENTS.header }}
      >
        <div className="p-10 gap-6 lg:basis-1/2 max-h-[642px] flex justify-center items-center bg-transparent">
          <Carousel
            centerMode={true}
            centerSlidePercentage={100}
            // showArrows={false}
            showStatus={false}
            // showIndicators={false}
            infiniteLoop
            // autoPlay={true}
            // interval={2000}
            // onChange={(ind, item) => setElement(data[ind])}
            // onSwipeMove={() => {}}
            showThumbs={false}
            stopOnHover={false}
            swipeable={true}
            className="gap-6 lg:w-full max-w-[530px] max-h-[642px] bg-black/opacity-20 rounded-lg mt-6 lg:mt-0 flex items-center"
          >
            {reportPreview.map((item, ind) => (
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
        </div>{" "}
      </div>

      {/* Informed Decision */}
      <section
        className="py-20 text-center"
        style={{
          backgroundColor: REVA_COLORS.background.secondary,
          color: REVA_COLORS.text.dark,
        }}
      >
        <h2 className="text-4xl font-semibold">Informed Decision</h2>
        <p className="mt-6 text-xl">
          With REVA make quick and informed land investment decisions.
        </p>
      </section>

      {/* Pricing */}
      {/* <section className="py-20 bg-white dark:bg-surface text-gray-900 dark:text-white text-center">
        <h2 className="text-4xl font-semibold">Pricing Plans</h2>
        <p className="mt-6 text-xl">
          Due diligence reports start from{" "}
          <span className="font-bold text-blue-600">₦30,000</span>, varying by
          LGA selection.
        </p>
      </section> */}

      <RevaFooterSection />
    </div>
  );
};

export default RevaLandingPage;
