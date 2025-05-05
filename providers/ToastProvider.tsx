"use client";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";

import { ReactNode } from "react";

export default function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <ToastContainer autoClose={8000} />
    </>
  );
}
