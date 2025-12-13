import Image from "next/image";
import { REVA_COLORS, REVA_GRADIENTS } from "@/lib/reva-colors";

export default function RevaLoading() {
  return (
    <div
      className="h-screen w-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${REVA_COLORS.background.primary} 0%, ${REVA_COLORS.slate[50]} 50%, ${REVA_COLORS.background.secondary} 100%)`,
      }}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-10 animate-pulse"
          style={{
            background: `radial-gradient(circle, ${REVA_COLORS.primary.light} 0%, transparent 70%)`,
            animation: "float 6s ease-in-out infinite",
          }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-5 animate-pulse"
          style={{
            background: `radial-gradient(circle, ${REVA_COLORS.secondary.light} 0%, transparent 70%)`,
            animation: "float 8s ease-in-out infinite reverse",
          }}
        />
      </div>

      {/* Main loading container */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Logo container with enhanced animation */}
        <div className="relative">
          <div
            className="absolute inset-0 rounded-full animate-ping opacity-20"
            style={{
              background: `radial-gradient(circle, ${REVA_COLORS.primary.light} 0%, transparent 70%)`,
              animation: "ping 2s cubic-bezier(0, 0, 0.2, 1) infinite",
            }}
          />
          <div
            className="relative animate-bounce"
            style={{
              animationDuration: "2s",
              animationTimingFunction: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
            }}
          >
            <Image
              src="/reva/revaLogo.png"
              alt="Reva Logo"
              width={120}
              height={120}
              priority
              className="drop-shadow-lg"
            />
          </div>
        </div>

        {/* Loading text and progress */}
        <div className="flex flex-col items-center gap-4">
          <h2
            className="text-2xl font-bold tracking-wide"
            style={{ color: REVA_COLORS.text.primary }}
          >
            Loading Reva Dashboard
          </h2>

          <p
            className="text-sm font-medium opacity-75"
            style={{ color: REVA_COLORS.text.secondary }}
          >
            Preparing your workspace...
          </p>

          {/* Enhanced loading dots */}
          <div className="flex items-center gap-2 mt-2">
            <div
              className="w-3 h-3 rounded-full animate-bounce"
              style={{
                backgroundColor: REVA_COLORS.primary.light,
                animationDelay: "0ms",
                animationDuration: "1.4s",
              }}
            />
            <div
              className="w-3 h-3 rounded-full animate-bounce"
              style={{
                backgroundColor: REVA_COLORS.secondary.light,
                animationDelay: "200ms",
                animationDuration: "1.4s",
              }}
            />
            <div
              className="w-3 h-3 rounded-full animate-bounce"
              style={{
                backgroundColor: REVA_COLORS.blueGradient.light,
                animationDelay: "400ms",
                animationDuration: "1.4s",
              }}
            />
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden mt-4">
          <div
            className="h-full rounded-full animate-pulse"
            style={{
              background: REVA_GRADIENTS.primary,
              animation: "progress 2s ease-in-out infinite",
              width: "60%",
            }}
          />
        </div>

        {/* Loading steps */}
        <div className="flex flex-col items-center gap-2 mt-4">
          <div className="flex items-center gap-2 text-xs opacity-60">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: REVA_COLORS.status.success }}
            />
            <span style={{ color: REVA_COLORS.text.secondary }}>
              Initializing...
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs opacity-40">
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: REVA_COLORS.primary.light }}
            />
            <span style={{ color: REVA_COLORS.text.secondary }}>
              Loading modules...
            </span>
          </div>
        </div>
      </div>

      {/* Custom CSS animations */}
      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
          }
        }

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
