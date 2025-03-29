"use client";

import Head from "next/head";
import { FC } from "react";
import { motion } from "framer-motion";
import RevaDueDiligenceForm from "./Reva";
import { RevaHeroSection } from "./RevaHeroSection";
import { RevaFooterSection } from "./RevaFooterSection";

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

  return (
    <div>
      <Head>
        <title>REVA - Real Estate Due Diligence</title>
        <meta
          name="description"
          content="Real Estate Due Diligence Just Got Intelligent!"
        />
      </Head>

      <RevaDueDiligenceForm />

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
              and trusted property insights with just a few clicks.
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
            "Comprehensive Property Insights",
            "Fast & Reliable Reports",
            "User-Friendly Interface",
            "Secure Payment Processing",
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

      {/* Pricing */}
      <section className="py-20 bg-white text-gray-900 text-center">
        <h2 className="text-4xl font-semibold">Pricing Plans</h2>
        <p className="mt-6 text-xl">
          Due diligence reports start from{" "}
          <span className="font-bold text-blue-600">₦30,000</span>, varying by
          LGA selection.
        </p>
      </section>

      <RevaFooterSection />
    </div>
  );
};

export default RevaLandingPage;
