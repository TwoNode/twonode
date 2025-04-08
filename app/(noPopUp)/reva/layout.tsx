import ToastProvider from "@/components/ToastProvider";
import React from "react";

export default function RevaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ToastProvider>{children}</ToastProvider>;
}
