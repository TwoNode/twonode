"use client";

import Head from "next/head";
import { FC } from "react";
// import RevaDueDiligenceForm from "../Reva";
import { RevaHeroSection } from "../RevaHeroSection";
import { RevaFooterSection } from "../RevaFooterSection";

const RevaFormPage: FC = () => {
  return (
    <div>
      <Head>
        <title>Form: Due Diligence Request </title>
        <meta
          name="description"
          content="Real Estate Due Diligence Just Got Intelligent!"
        />
      </Head>

      <RevaHeroSection showRequestButton={false} />
      {/* <RevaDueDiligenceForm /> */}
      <RevaFooterSection />
    </div>
  );
};

export default RevaFormPage;
