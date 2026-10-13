import { REVA_GRADIENTS } from "@/reva/colors";
import { cn } from "@/lib/utils";

// Same ink as the real sidebar (components/sidebars/sidebar.tsx).
const SIDEBAR_INK = "#0A0F16";

const bar = "animate-pulse motion-reduce:animate-none";
const onDark = `${bar} bg-white/10`;
const onLight = `${bar} rounded-md bg-slate-200/70 dark:bg-white/10`;

type Props = {
  /** The user panel has the taller 80px top bar; the admin panel 64px. */
  variant?: "admin" | "user";
  /** Match the rail the real sidebar will open with, so nothing shifts. */
  railCollapsed?: boolean;
};

/**
 * Shown by the REVA panel layouts while the session and role are checked.
 * The check itself must stay (it keeps admin screens from flashing for the
 * wrong person and decides which menu items exist), so this is the layout
 * with placeholders instead of content: the same rail, top bar and page
 * regions, none of the role-specific items. When the real panel replaces it,
 * nothing moves.
 */
export default function RevaLoading({
  variant = "admin",
  railCollapsed = false,
}: Props) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="flex h-screen w-screen overflow-hidden bg-background"
    >
      <span className="sr-only">Loading your workspace</span>

      {/* Sidebar */}
      <div
        className={cn(
          "hidden h-full shrink-0 flex-col gap-2 p-3 lg:flex",
          railCollapsed ? "lg:w-[76px]" : "lg:w-[284px]"
        )}
        style={{ background: SIDEBAR_INK }}
      >
        <div className="flex items-center gap-3 px-1 py-2">
          <div className={cn(onDark, "h-11 w-11 shrink-0 rounded-full")} />
          {!railCollapsed && <div className={cn(onDark, "h-4 w-28 rounded")} />}
        </div>
        <div className="my-2 h-px bg-white/10" />
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center gap-3 rounded-lg px-2 py-2.5",
              railCollapsed && "justify-center"
            )}
          >
            <div className={cn(onDark, "h-5 w-5 shrink-0 rounded")} />
            {!railCollapsed && (
              <div
                className={cn(onDark, "h-3.5 rounded")}
                style={{ width: `${52 + ((i * 17) % 40)}%` }}
              />
            )}
          </div>
        ))}
        <div className="mt-auto flex items-center gap-3 border-t border-white/10 px-1 pt-3">
          <div className={cn(onDark, "h-10 w-10 shrink-0 rounded-full")} />
          {!railCollapsed && (
            <div className="flex flex-1 flex-col gap-1.5">
              <div className={cn(onDark, "h-3 w-24 rounded")} />
              <div className={cn(onDark, "h-2.5 w-16 rounded")} />
            </div>
          )}
        </div>
      </div>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div
          className={cn(
            "flex shrink-0 items-center justify-between px-4 sm:px-6",
            variant === "user" ? "h-20" : "h-16"
          )}
          style={{ background: REVA_GRADIENTS.header }}
        >
          <div className={cn(onDark, "h-8 w-8 rounded-lg lg:hidden")} />
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className={cn(onDark, "h-9 w-9 rounded-full")} />
            <div className={cn(onDark, "h-9 w-28 rounded-2xl")} />
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-4 sm:p-6 lg:p-10">
          <div className="mx-auto flex max-w-6xl flex-col gap-6">
            <div className={cn(onLight, "h-9 w-72")} />
            <div className={cn(onLight, "h-14 w-full rounded-xl")} />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className={cn(onLight, "h-64 rounded-xl")} />
              <div className={cn(onLight, "hidden h-64 rounded-xl lg:block")} />
              <div className={cn(onLight, "hidden h-64 rounded-xl lg:block")} />
              <div className={cn(onLight, "hidden h-64 rounded-xl lg:block")} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
