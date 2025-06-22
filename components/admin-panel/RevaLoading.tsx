import Image from "next/image";
import { REVA_COLORS } from "@/reva-colors";

export default function RevaLoading() {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-white dark:bg-zinc-900">
      <div className="flex flex-col items-center gap-6">
        <div className="animate-bounce">
          <Image
            src="/reva/revaLogo.png"
            alt="Reva Logo"
            width={100}
            height={100}
            priority
          />
        </div>
        <div className="flex items-center gap-3">
          <span
            className="text-sm font-bold dark:text-white"
            style={{ color: REVA_COLORS.text.primary }}
          >
            Loading Reva Dashboard
          </span>
          <div className="flex gap-1">
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: REVA_COLORS.primary.light }}
            ></span>
            <span
              className="w-1 h-1 rounded-full animate-pulse delay-75"
              style={{ backgroundColor: REVA_COLORS.secondary.light }}
            ></span>
            <span
              className="w-1 h-1 rounded-full animate-pulse delay-150"
              style={{ backgroundColor: REVA_COLORS.blueGradient.light }}
            ></span>
          </div>
        </div>
      </div>
    </div>
  );
}
