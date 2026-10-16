import Image from "next/image";
import Link from "next/link";
import React from "react";
import { REVA_COLORS } from "@/reva/colors";

interface RevaFooterSectionProps {
  dashboardType?: "user" | "admin";
  customLogoLink?: string;
  customCopyrightText?: string;
  showLogo?: boolean;
}

export const RevaFooterSection = ({
  dashboardType = "user",
  customLogoLink,
  customCopyrightText,
  showLogo = true,
}: RevaFooterSectionProps) => {
  const defaultLogoLink =
    customLogoLink ||
    (dashboardType === "admin" ? "/reva-restricted" : "/reva");
  const defaultCopyrightText =
    customCopyrightText || "&copy; 2025 REVA. All rights reserved.";

  return (
    <>
      {/* Footer Section */}
      <footer
        className="py-10 text-white text-center"
        style={{ backgroundColor: REVA_COLORS.background.dark }}
      >
        {showLogo && (
          <div className="flex justify-center mb-4">
            <Link href={defaultLogoLink}>
              <Image
                src="/reva/revaLogo.png"
                alt="REVA Logo"
                width={50}
                height={50}
                className="bg-white/90 dark:bg-surface rounded-full"
              />
            </Link>
          </div>
        )}
        <p
          className="text-lg"
          dangerouslySetInnerHTML={{ __html: defaultCopyrightText }}
        />
        <div className="mt-3 text-sm text-slate-400">
          <Link
            href="/"
            className="text-cyan-400 hover:text-cyan-300 transition-colors underline underline-offset-4"
          >
            Powered by TwoNode Technologies
          </Link>
        </div>
      </footer>
    </>
  );
};
