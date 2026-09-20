import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  icons: {
    icon: [
      { url: "/reva/favicon/favicon.ico", sizes: "any" },
      { url: "/reva/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/reva/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/reva/favicon/favicon.ico",
    apple: "/reva/favicon/apple-touch-icon.png",
  },
};

export default function RevaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-product="reva">{children}</div>
  );
}
