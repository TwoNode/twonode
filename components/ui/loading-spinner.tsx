"use client";

import { REVA_COLORS, REVA_GRADIENTS } from "@/reva/colors";
import { Loader2, Sparkles } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  variant?: "default" | "minimal" | "fullscreen";
  className?: string;
}

export function LoadingSpinner({
  size = "md",
  text = "Loading...",
  variant = "default",
  className = "",
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  if (variant === "minimal") {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <Loader2
          className={`${sizeClasses[size]} animate-spin`}
          style={{ color: REVA_COLORS.primary.light }}
        />
      </div>
    );
  }

  if (variant === "fullscreen") {
    return (
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm ${className}`}
        style={{ backgroundColor: `${REVA_COLORS.background.secondary}CC` }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div
              className={`${sizeClasses[size]} rounded-full border-4 border-gray-200`}
            />
            <div
              className={`${sizeClasses[size]} absolute inset-0 rounded-full border-4 border-transparent border-t-current animate-spin`}
              style={{ borderTopColor: REVA_COLORS.primary.light }}
            />
          </div>
          {text && (
            <p
              className={`${textSizes[size]} font-medium`}
              style={{ color: REVA_COLORS.text.secondary }}
            >
              {text}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 p-6 ${className}`}
    >
      <div className="relative">
        {/* Outer ring */}
        <div
          className={`${sizeClasses[size]} rounded-full border-2 border-gray-200`}
        />

        {/* Animated spinner */}
        <div
          className={`${sizeClasses[size]} absolute inset-0 rounded-full border-2 border-transparent border-t-current animate-spin`}
          style={{ borderTopColor: REVA_COLORS.primary.light }}
        />

        {/* Inner glow effect */}
        <div
          className={`${
            sizeClasses[size === "lg" ? "lg" : "md"]
          } absolute inset-1 rounded-full opacity-20 animate-pulse`}
          style={{
            background: `radial-gradient(circle, ${REVA_COLORS.primary.light} 0%, transparent 70%)`,
          }}
        />
      </div>

      {text && (
        <div className="flex flex-col items-center gap-2">
          <p
            className={`${textSizes[size]} font-medium text-center`}
            style={{ color: REVA_COLORS.text.primary }}
          >
            {text}
          </p>

          {/* Animated dots */}
          <div className="flex items-center gap-1">
            <div
              className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{
                backgroundColor: REVA_COLORS.primary.light,
                animationDelay: "0ms",
                animationDuration: "1.4s",
              }}
            />
            <div
              className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{
                backgroundColor: REVA_COLORS.secondary.light,
                animationDelay: "200ms",
                animationDuration: "1.4s",
              }}
            />
            <div
              className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{
                backgroundColor: REVA_COLORS.blueGradient.light,
                animationDelay: "400ms",
                animationDuration: "1.4s",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Dashboard-specific loading component
export function DashboardLoadingSpinner({
  text = "Loading dashboard content...",
  className = "",
}: {
  text?: string;
  className?: string;
}) {
  return (
    <div
      className={`min-h-[400px] flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200 ${className}`}
      style={{ backgroundColor: REVA_COLORS.background.primary }}
    >
      <div className="flex flex-col items-center gap-6">
        {/* Logo with animation */}
        <div className="relative">
          <div
            className="absolute inset-0 rounded-full animate-ping opacity-20"
            style={{
              background: `radial-gradient(circle, ${REVA_COLORS.primary.light} 0%, transparent 70%)`,
              animation: "ping 2s cubic-bezier(0, 0, 0.2, 1) infinite",
            }}
          />
          <div
            className="relative animate-pulse"
            style={{
              animationDuration: "2s",
            }}
          >
            <Sparkles
              className="w-12 h-12"
              style={{ color: REVA_COLORS.primary.light }}
            />
          </div>
        </div>

        {/* Loading text */}
        <div className="flex flex-col items-center gap-3">
          <h3
            className="text-lg font-semibold"
            style={{ color: REVA_COLORS.text.primary }}
          >
            {text}
          </h3>

          {/* Progress indicator */}
          <div className="w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full animate-pulse"
              style={{
                background: REVA_GRADIENTS.primary,
                animation: "progress 2s ease-in-out infinite",
                width: "60%",
              }}
            />
          </div>
        </div>

        {/* Loading steps */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-sm opacity-60">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: REVA_COLORS.status.success }}
            />
            <span style={{ color: REVA_COLORS.text.secondary }}>
              Preparing data...
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm opacity-40">
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: REVA_COLORS.primary.light }}
            />
            <span style={{ color: REVA_COLORS.text.secondary }}>
              Loading components...
            </span>
          </div>
        </div>
      </div>

      {/* Custom CSS animations */}
      <style jsx>{`
        @keyframes progress {
          0% {
            width: 0%;
          }
          50% {
            width: 60%;
          }
          100% {
            width: 100%;
          }
        }

        @keyframes ping {
          75%,
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

// Simple loading component for inline use
export function InlineLoadingSpinner({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-center p-4 ${className}`}>
      <Loader2
        className="w-5 h-5 animate-spin"
        style={{ color: REVA_COLORS.primary.light }}
      />
    </div>
  );
}
