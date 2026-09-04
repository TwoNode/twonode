"use client";

import { useKindeAuth } from "@kinde-oss/kinde-auth-nextjs";
import React from "react";
import { REVA_COLORS, REVA_GRADIENTS } from "@/reva/colors";
import Image from "next/image";
import { User } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

function getInitials(name: string) {
  if (!name) return "U";
  const parts = name.split(" ");
  if (parts.length === 1) return parts[0][0];
  return parts[0][0] + parts[1][0];
}

interface WelcomeProps {
  dashboardType?: "user" | "admin";
  customGreeting?: string;
  customDescription?: string;
  customInstructions?: string[];
}

export function Welcome({
  dashboardType = "user",
  customGreeting,
  customDescription,
  customInstructions,
}: WelcomeProps) {
  const { user } = useKindeAuth();
  const { theme } = useTheme();
  const userName = user?.given_name || user?.family_name || "User";
  const userAvatar = user?.picture || null;
  const initials = getInitials(userName);

  // Default content based on dashboard type
  const defaultGreeting = customGreeting || `Welcome, ${userName}`;
  const defaultDescription =
    customDescription || "Hope you are having a great day!";
  const defaultInstructions = customInstructions || [
    "Start by requesting a report or reviewing your previous reports to stay on top of your progress.",
    "Have questions? Our team is here to help don't hesitate to reach out!",
  ];

  const dashboardTitle = dashboardType === "admin" ? "REVA Admin" : "REVA";

  return (
    <div className="w-full flex flex-col items-center mb-20">
      {/* Gradient Accent Bar */}
      <div
        className="w-full h-2 rounded-t-xl mb-0.5"
        style={{ background: REVA_GRADIENTS.header, opacity: 0.9 }}
      />
      <div
        className="relative w-full max-w-2xl rounded-2xl shadow-xl dark:shadow-none border dark:border-white/10"
        style={{
          background: theme === "dark" ? "#101F2C" : REVA_COLORS.background.secondary,
          borderColor: REVA_COLORS.border.light,
        }}
      >
        {/* Decorative Watermark */}
        <div className="absolute right-4 top-4 opacity-10 pointer-events-none select-none hidden md:block">
          <Image
            src="/reva/revaLogo.png"
            alt="REVA Logo"
            width={60}
            height={60}
          />
        </div>
        <div className="flex flex-col md:flex-row items-center gap-6 p-8">
          {/* Avatar */}
          <div className="shrink-0">
            {userAvatar ? (
              <img
                src={userAvatar}
                alt="User Avatar"
                className="w-20 h-20 rounded-full border-4 shadow-md"
                style={{ borderColor: REVA_COLORS.primary.light }}
              />
            ) : (
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold shadow-md border-4"
                style={{
                  background: REVA_GRADIENTS.header,
                  color: REVA_COLORS.text.light,
                  borderColor: REVA_COLORS.primary.light,
                }}
              >
                {initials}
              </div>
            )}
          </div>
          {/* Welcome Text */}
          <div className="flex-1 flex flex-col gap-2 items-center md:items-start">
            <div className="flex items-center gap-2">
              <User size={28} style={{ color: REVA_COLORS.primary.light }} />
              <h1
                className="text-3xl md:text-4xl font-extrabold"
                style={{ color: theme === "dark" ? "#fff" : REVA_COLORS.text.dark }}
              >
                {defaultGreeting}
              </h1>
            </div>
            <p
              className="text-base md:text-lg font-medium"
              style={{ color: theme === "dark" ? "#9CB3C4" : REVA_COLORS.text.secondary }}
            >
              {defaultDescription}
            </p>
            <div className="mt-4 w-full bg-linear-to-r from-transparent via-blue-100 dark:via-white/10 to-transparent h-0.5 rounded-full opacity-60" />
            <div className="mt-4 flex flex-col gap-2 w-full">
              {defaultInstructions.map((instruction, index) => (
                <p
                  key={index}
                  className="text-base md:text-lg font-medium leading-relaxed"
                  style={{ color: theme === "dark" ? "#E7EEF3" : REVA_COLORS.text.dark }}
                >
                  {instruction}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
