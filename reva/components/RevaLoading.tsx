import { REVA_COLORS } from "@/reva/colors";

/**
 * Shown by the REVA panel layouts while the session and role are being checked.
 * The check itself must stay (it keeps admin screens from flashing for the
 * wrong person), so this is only the waiting state: a blank page in the app's
 * background colour and a thin progress bar along the top. No logo, text or
 * animation beyond the bar, which stands still for people who ask for reduced
 * motion.
 */
export default function RevaLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="h-screen w-screen bg-background"
    >
      <span className="sr-only">Loading</span>
      <div className="h-0.5 w-full overflow-hidden bg-transparent">
        <div
          className="reva-loading-bar h-full w-1/3 rounded-full motion-reduce:w-full motion-reduce:animate-none"
          style={{ backgroundColor: REVA_COLORS.primary.light }}
        />
      </div>
      <style>{`
        @keyframes reva-loading-slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        .reva-loading-bar { animation: reva-loading-slide 1.1s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
