"use client";

import Link from "next/link";
import React from "react";
import { REVA_COLORS, REVA_GRADIENTS } from "@/reva/colors";

interface ComingSoonProps {
  dashboardType?: "user" | "admin";
  customTitle?: string;
  customDescription?: string;
  customButtonText?: string;
  customButtonLink?: string;
}

export const ComingSoon = ({
  dashboardType = "user",
  customTitle,
  customDescription,
  customButtonText,
  customButtonLink,
}: ComingSoonProps) => {
  const defaultTitle = customTitle || "Coming Soon";
  const defaultDescription =
    customDescription ||
    "We're working hard to bring you something amazing. Stay tuned!";
  const defaultButtonText = customButtonText || "Home";
  const defaultButtonLink =
    customButtonLink ||
    (dashboardType === "admin"
      ? "/reva-restricted/dashboard"
      : "/reva/dashboard");

  return (
    <div
      className="flex items-center justify-center h-[80vh] max-h-screen"
      style={{ background: REVA_GRADIENTS.header }}
    >
      <div
        className="text-center p-8 rounded-lg shadow-lg max-w-md"
        style={{ backgroundColor: REVA_COLORS.background.secondary }}
      >
        <h1
          className="text-4xl font-bold mb-4"
          style={{ color: REVA_COLORS.text.dark }}
        >
          {defaultTitle}
        </h1>
        <p
          className="text-lg mb-6"
          style={{ color: REVA_COLORS.text.secondary }}
        >
          {defaultDescription}
        </p>
        <div className="flex justify-center">
          <Link
            href={defaultButtonLink}
            className="px-6 py-3 rounded-lg shadow transition-all"
            style={{
              backgroundColor: REVA_COLORS.primary.light,
              color: REVA_COLORS.text.light,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor =
                REVA_COLORS.secondary.light;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = REVA_COLORS.primary.light;
            }}
          >
            {defaultButtonText}
          </Link>
        </div>
      </div>
    </div>
  );
};
