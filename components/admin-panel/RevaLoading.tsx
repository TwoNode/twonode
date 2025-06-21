import Image from "next/image";

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
          <span className="text-sm font-bold text-[#032740] dark:text-white">
            Loading Reva Dashboard
          </span>
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></span>
            <span className="w-1 h-1 bg-blue-400 rounded-full animate-pulse delay-75"></span>
            <span className="w-1 h-1 bg-blue-200 rounded-full animate-pulse delay-150"></span>
          </div>
        </div>
      </div>
    </div>
  );
}
