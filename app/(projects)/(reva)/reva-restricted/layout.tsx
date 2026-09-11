import ToastProvider from "@/providers/ToastProvider";
import React from "react";

export default function RevaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <div data-product="reva">{children}</div>
    </ToastProvider>
  );
}
