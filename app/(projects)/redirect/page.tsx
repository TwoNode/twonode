"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

export default function RedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectionPage = searchParams.get("redirectionPage") || "/";

  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace(redirectionPage);
    }, 1200); // 1.8s delay for UX
    return () => clearTimeout(timeout);
  }, [redirectionPage, router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #e0e7ff 0%, #f0fdfa 100%)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          background: "white",
          padding: "2.5rem 2rem 2rem 2rem",
          borderRadius: "1.5rem",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <svg
          width="60"
          height="60"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ marginBottom: 16 }}
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="#6366f1"
            strokeWidth="2"
            fill="#eef2ff"
          />
          <path
            d="M8 12l3 3 5-5"
            stroke="#22d3ee"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <h2
          style={{
            fontSize: "2rem",
            fontWeight: 700,
            color: "#3730a3",
            marginBottom: 8,
          }}
        >
          Redirecting…
        </h2>
        <p
          style={{
            color: "#64748b",
            fontSize: "1.1rem",
            marginBottom: 24,
          }}
        >
          Please wait while we take you to your destination.
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            className="redirect-spinner"
            style={{
              width: 36,
              height: 36,
              border: "4px solid #c7d2fe",
              borderTop: "4px solid #6366f1",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              display: "inline-block",
            }}
          />
        </div>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
