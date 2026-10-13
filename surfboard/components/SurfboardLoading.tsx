import { SURFBOARD_GRADIENTS } from "@/surfboard/colors";
import { cn } from "@/lib/utils";

const bar = "animate-pulse motion-reduce:animate-none";
const onDark = `${bar} bg-white/15`;
const onLight = `${bar} rounded-md bg-slate-200/70 dark:bg-white/10`;

/**
 * Shown by the Surfboard user panel until the browser has the sidebar state
 * (and, if the server could not read the session, the subscription check).
 * It is the layout with placeholders instead of content: the same top bar,
 * rail and page regions, none of the subscription-dependent items. When the
 * real panel replaces it, nothing moves.
 */
export default function SurfboardLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="grid h-screen w-screen grid-rows-[80px_1fr] overflow-hidden bg-background"
    >
      <span className="sr-only">Loading your workspace</span>

      <div
        className="flex items-center gap-3 border-b border-white/10 px-6 shadow-md"
        style={{ background: SURFBOARD_GRADIENTS.hero }}
      >
        <div className={cn(onDark, "h-12 w-12 rounded-full")} />
        <div className={cn(onDark, "hidden h-5 w-28 rounded lg:block")} />
        <div className="flex-1" />
        <div className={cn(onDark, "h-9 w-9 rounded-full")} />
        <div className={cn(onDark, "h-9 w-28 rounded-2xl")} />
      </div>

      <div className="flex min-h-0">
        <div
          className="hidden h-full shrink-0 flex-col gap-2 p-3 lg:flex lg:w-[284px]"
          style={{ background: SURFBOARD_GRADIENTS.hero }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg px-2 py-2.5"
            >
              <div className={cn(onDark, "h-5 w-5 shrink-0 rounded")} />
              <div
                className={cn(onDark, "h-3.5 rounded")}
                style={{ width: `${50 + ((i * 17) % 40)}%` }}
              />
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-hidden p-4">
          <div className="mx-auto flex max-w-6xl flex-col gap-6">
            <div className={cn(onLight, "h-9 w-64")} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={cn(onLight, "h-28 rounded-xl")} />
              ))}
            </div>
            <div className={cn(onLight, "h-72 rounded-xl")} />
          </div>
        </div>
      </div>
    </div>
  );
}
