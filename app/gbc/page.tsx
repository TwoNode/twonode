import React from "react";
import Navbar from "@/components/Navbar";
import { SignUpforOurSurvey } from "@/components/HomeComponents";
import { Footer } from "@/components/Footer";
import { Gbc } from "./Gbc";
import { GbcBanner } from "./GbcBanner";

export default function Home() {
  return (
    <section className="bg-teal-5000">
      <Navbar />
      <GbcBanner />
      <Gbc />

      {/* Sign Up for Our Survey Data Management */}
      <SignUpforOurSurvey url="https://survey123.arcgis.com/share/a0d72b89d7a14eae9da311fdae8fc5c5" />

      {/* Footer Section */}
      <Footer />
    </section>
  );
}
