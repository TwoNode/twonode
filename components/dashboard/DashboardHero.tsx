import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface DashboardHeroCta {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: LucideIcon;
}

export interface DashboardHeroProps {
  greeting: string;
  title: string;
  description: string;
  pills?: string[];
  cta?: DashboardHeroCta;
  /** e.g. `linear-gradient(120deg, ${colors.primary.dark}, ${colors.primary.main})` */
  gradient: string;
  className?: string;
}

/**
 * Solid-gradient greeting banner, replacing the bare `<h1>Dashboard</h1>` +
 * gray subtitle pattern currently at the top of every dashboard page.
 */
export function DashboardHero({
  greeting,
  title,
  description,
  pills,
  cta,
  gradient,
  className,
}: DashboardHeroProps) {
  const CtaIcon = cta?.icon;
  const ctaContent = cta && (
    <span className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-gray-900 shadow-lg transition hover:opacity-90">
      {CtaIcon && <CtaIcon className="h-4 w-4" />}
      {cta.label}
    </span>
  );

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl px-7 py-7 text-white shadow-xl sm:px-9",
        className
      )}
      style={{ background: gradient }}
    >
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-16 right-24 h-36 w-36 rounded-full bg-white/5"
        aria-hidden
      />
      <div className="relative flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="mb-1.5 text-sm font-semibold text-white/80">
            {greeting}
          </p>
          <h1 className="text-[28px] font-extrabold leading-tight tracking-tight sm:text-[32px]">
            {title}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/85">
            {description}
          </p>
          {pills && pills.length > 0 && (
            <div className="mt-3.5 flex flex-wrap gap-2">
              {pills.map((pill) => (
                <span
                  key={pill}
                  className="rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-semibold"
                >
                  {pill}
                </span>
              ))}
            </div>
          )}
        </div>
        {cta &&
          (cta.href ? (
            <Link href={cta.href} className="shrink-0">
              {ctaContent}
            </Link>
          ) : (
            <button type="button" onClick={cta.onClick} className="shrink-0">
              {ctaContent}
            </button>
          ))}
      </div>
    </section>
  );
}
