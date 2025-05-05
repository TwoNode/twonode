"use client";

import { FC } from "react";
import { motion } from "framer-motion";
import { RevaHeroSection } from "./RevaHeroSection";
import { RevaFooterSection } from "./RevaFooterSection";

import "react-responsive-carousel/lib/styles/carousel.min.css"; // requires a loader
import { Carousel } from "react-responsive-carousel";

const RevaLandingPage: FC = () => {
  const coreFeatures: string[] = [
    "Quick & seamless report requests",
    "Secure payment processing",
    "Access to detailed land records",
    "Easy Document Uploads",
    "Mobile-First Experience",
  ];

  interface Step {
    title: string;
    desc: string;
  }

  const howItWorks: Step[] = [
    {
      title: "Submit Request",
      desc: "Provide the necessary property details and submit your request.",
    },
    {
      title: "Make Payment",
      desc: "Securely complete your payment online.",
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
      desc: "Renders Surveyor's data in a manner that provides easy access, management and data-driven insight.",
      img: "reva/preview/reva1.jpg",
    },
    {
      number: 2,
      title: "Oil and Gas ROW and Utility Asset Network Management",
      desc: "Keep track of all your assets, from pipelines to valve pits, metering stations, place markers, ensuring they are always up-to-date, accurately mapped, and accessible real-time with a mobile app.",
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
      <section className="py-20 px-5 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-900 text-center">
        <h2 className="text-4xl font-extrabold text-gray-800 mb-10">
          About REVA
        </h2>

        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center md:items-start">
          <div className="md:w-1/2 px-6 md:px-12">
            <p className="text-lg p-5 leading-relaxed text-justify text-gray-700">
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
      <section className="py-20 bg-gray-100 text-gray-900 text-center">
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
              className="p-6 bg-white rounded-xl shadow-md w-64 text-center"
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
      <section className="py-20 bg-gray-100 text-gray-900">
        <h2 className="text-4xl font-semibold text-center">Core Features</h2>
        <div className="flex flex-wrap justify-center gap-6 mt-10 px-10">
          {coreFeatures.map((feature, index) => (
            <motion.div
              key={index}
              className="p-6 bg-white rounded-xl shadow-md w-64 text-center hover:shadow-lg hover:scale-105 transition-transform duration-300"
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
      <section className="py-20 bg-white text-gray-900">
        <h2 className="text-4xl font-semibold text-center">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mt-12 px-12">
          {howItWorks.map((step, index) => (
            <motion.div
              key={index}
              className="p-8 border rounded-xl text-center shadow-lg bg-gray-50 hover:shadow-2xl transition-all"
              animate={{ opacity: 1, scale: 1 }}
              initial={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
            >
              <h3 className="text-2xl font-semibold">Step {index + 1}</h3>
              <p className="mt-2 text-lg">{step.title}</p>
              <p className="text-gray-500 mt-2">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <div className="p-10 bg-black bg-gradient-to-r from-blue-800 to-gray-900 text-white">
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
      <section className="py-20 bg-white text-gray-900 text-center">
        <h2 className="text-4xl font-semibold">Informed Decision</h2>
        <p className="mt-6 text-xl">
          With REVA make quick and informed land investment decisions.
        </p>
      </section>

      {/* Pricing */}
      {/* <section className="py-20 bg-white text-gray-900 text-center">
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
