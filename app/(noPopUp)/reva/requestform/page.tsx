"use client";

import Head from "next/head";
import { FC } from "react";
import { motion } from "framer-motion";
import RevaDueDiligenceForm from "../Reva";
import { RevaHeroSection } from "../RevaHeroSection";
import { RevaFooterSection } from "../RevaFooterSection";

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

      <RevaHeroSection showRequestButton={false} />
      <RevaDueDiligenceForm />
      <RevaFooterSection />
    </div>
  );
};

export default RevaLandingPage;
