import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";

export const RevaHeroSection = ({ showRequestButton = true }) => {
  return (
    <>
      {/* Hero Section */}
      <section className="text-center py-20 px-5 bg-gradient-to-r from-blue-800 to-gray-900 text-white">
        <div className="flex justify-center mb-4">
          <Image
            src="/reva/revaLogo.png"
            alt="REVA Logo"
            width={100}
            height={100}
            className="bg-white/70 rounded-full"
          />
        </div>

        <h1 className="text-5xl font-bold">
          Real Estate Due Diligence Just Got Intelligent!
        </h1>

        <p className="mt-4 text-lg">
          Request a structured land report with ease in just a few clicks.
        </p>

        {showRequestButton && (
          <Link href={"/reva/requestform"} passHref>
            {/* Button to request a report */}
            <Button className="mt-6 bg-blue-600 px-6 py-3 text-lg hover:border-2 hover:border-blue-400 transition-all">
              Request a Report
            </Button>
          </Link>
        )}
      </section>
    </>
  );
};
