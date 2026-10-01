"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { AuthLinks } from "@/reva/components/shared/AuthLinks";
import { REVA_COLORS, REVA_GRADIENTS } from "@/reva/colors";

interface RevaHeroSectionProps {
  showRequestButton?: boolean;
  smallLogo?: boolean;
  showTitle?: boolean;
  dashboardType?: "user" | "admin";
  customTitle?: string;
  customDescription?: string;
  customButtonText?: string;
  customButtonLink?: string;
  showAuthLinks?: boolean;
}

export const RevaHeroSection = ({
  showRequestButton = true,
  smallLogo = false,
  showTitle = true,
  dashboardType = "user",
  customTitle,
  customDescription,
  customButtonText,
  customButtonLink,
  showAuthLinks = true,
}: RevaHeroSectionProps) => {
  // Default values based on dashboard type
  const defaultTitle =
    customTitle || "Real Estate Due Diligence Just Got Intelligent!";
  const defaultDescription =
    customDescription ||
    "Request a structured land report with ease in just a few clicks.";
  const defaultButtonText = customButtonText || "Request a Report";
  const defaultButtonLink =
    customButtonLink ||
    (dashboardType === "admin"
      ? "/reva-restricted/dashboard"
      : "/reva/requestform");
  const logoLink = dashboardType === "admin" ? "/reva-restricted" : "/reva";

  return (
    <>
      {/* Hero Section */}
      <section
        className={`text-center ${
          smallLogo ? "py-5" : "py-20"
        } px-5 text-white`}
        style={{ background: REVA_GRADIENTS.header }}
      >
        <div className={`flex justify-center  ${smallLogo ? "mb-1" : "mb-4"}`}>
          <Link href={logoLink}>
            {
              /* Logo */
              smallLogo ? (
                <Image
                  src="/reva/revaLogo.png"
                  alt="REVA Logo"
                  width={50}
                  height={50}
                  className="bg-white/70 dark:bg-surface rounded-full"
                />
              ) : (
                <Image
                  src="/reva/revaLogo.png"
                  alt="REVA Logo"
                  width={100}
                  height={100}
                  className="bg-white/70 dark:bg-surface rounded-full"
                />
              )
            }
          </Link>
        </div>

        {showTitle && <h1 className="text-5xl font-bold">{defaultTitle}</h1>}

        <p className={`${smallLogo ? "text-md mt-2" : "mt-4 text-lg"}`}>
          {defaultDescription}
        </p>

        {showRequestButton && (
          <>
            <Link href={defaultButtonLink} passHref>
              {/* Button to request a report */}
              <Button
                className="mt-6 px-6 py-3 text-lg hover:border-2 transition-all"
                style={{
                  backgroundColor: REVA_COLORS.primary.light,
                  borderColor: REVA_COLORS.secondary.light,
                  color: REVA_COLORS.text.light,
                }}
              >
                {defaultButtonText}
              </Button>
            </Link>

            {showAuthLinks && <AuthLinks dashboardType={dashboardType} />}
          </>
        )}
      </section>
    </>
  );
};
