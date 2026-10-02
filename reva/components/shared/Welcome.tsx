"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  type LucideIcon,
  ArrowRight,
  ClipboardCheck,
  CreditCard,
  FilePlus,
  Info,
  LifeBuoy,
  ListChecks,
  User,
} from "lucide-react";
import { REVA_COLORS, REVA_GRADIENTS } from "@/reva/colors";
import { revaApi } from "@/reva/apiClient";
import { getInitials, roleLabel, timeGreeting } from "@/reva/utils/welcome";

type WelcomeAction = {
  label: string;
  href: string;
  icon: LucideIcon;
};

interface WelcomeProps {
  dashboardType?: "user" | "admin";
  /** Replaces the personalised "Good morning, Ada" heading. Leave out to get the personalised one. */
  customGreeting?: string;
  customDescription?: string;
  /** Short tips shown in a strip under the panel. */
  customInstructions?: string[];
  /** Replaces the two default shortcuts (the first is drawn as the primary button). */
  actions?: WelcomeAction[];
}

const DEFAULTS = {
  admin: {
    description:
      "Review incoming requests, verify payments and keep reports moving.",
    actions: [
      {
        label: "Review requests",
        href: "/reva-restricted/dashboard/review",
        icon: ClipboardCheck,
      },
      {
        label: "Verify payments",
        href: "/reva-restricted/dashboard/payment-verification",
        icon: CreditCard,
      },
    ] satisfies WelcomeAction[],
  },
  user: {
    description: "Request a property report, or pick up where you left off.",
    actions: [
      {
        label: "New request",
        href: "/reva/dashboard/newrequest",
        icon: FilePlus,
      },
      {
        label: "All requests",
        href: "/reva/dashboard/allrequests",
        icon: ListChecks,
      },
    ] satisfies WelcomeAction[],
  },
};

type Person = {
  firstName: string;
  lastName: string;
  picture: string | null;
  role: string | null;
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0b1620]";

/**
 * The panel at the top of a REVA dashboard: who you are, what day it is and the
 * two things you most likely want to do next.
 *
 * The name comes from the app's own session (the same source as the sidebar's
 * user menu) — not Kinde, which has no user for accounts that signed in with
 * email and password and used to leave this panel greeting "User".
 *
 * The time-based greeting and the date are worked out after mount, from the
 * browser's clock, so server and client markup match on first render; until
 * then the heading is a skeleton of the same height.
 */
export function Welcome({
  dashboardType = "user",
  customGreeting,
  customDescription,
  customInstructions,
  actions,
}: WelcomeProps) {
  const [person, setPerson] = useState<Person | null>(null);
  const [ready, setReady] = useState(false);
  const [clock, setClock] = useState<{ greeting: string; date: string } | null>(
    null
  );

  useEffect(() => {
    const now = new Date();
    setClock({
      greeting: timeGreeting(now.getHours()),
      date: now.toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    revaApi.session
      .get()
      .then((res) => {
        if (cancelled || !res.success || !res.data) return;
        const data = res.data;
        setPerson({
          firstName: data.firstName ?? "",
          lastName: data.lastName ?? "",
          picture: data.picture ?? null,
          role: data.role ?? data.platforms?.reva?.role ?? null,
        });
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const defaults = DEFAULTS[dashboardType];
  const shortcuts = actions ?? defaults.actions;
  const description = customDescription ?? defaults.description;
  const tips = customInstructions ?? [];
  const initials = getInitials(person?.firstName, person?.lastName);
  const role =
    roleLabel(person?.role) ?? (dashboardType === "admin" ? "Admin" : null);

  const heading =
    customGreeting ??
    (clock
      ? person?.firstName
        ? `${clock.greeting}, ${person.firstName}`
        : clock.greeting
      : "");
  const headingReady =
    ready && (customGreeting !== undefined || clock !== null);

  return (
    <section
      aria-labelledby="welcome-heading"
      className="w-full max-w-[95%] mx-auto px-4 sm:px-6"
    >
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/3 dark:shadow-none">
        {/* Soft brand glow — decorative, sits behind the content. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full blur-3xl"
          style={{
            background: `radial-gradient(closest-side, ${REVA_COLORS.primary.light}33, transparent)`,
          }}
        />

        <div className="relative flex flex-col gap-6 p-5 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4 sm:items-center sm:gap-5">
            <div
              data-testid="welcome-avatar"
              className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full text-base font-semibold shadow-sm ring-2 ring-white dark:ring-white/10 sm:h-16 sm:w-16 sm:text-xl"
              style={{
                background: REVA_GRADIENTS.header,
                color: REVA_COLORS.text.light,
              }}
              aria-hidden="true"
            >
              {person?.picture ? (
                // eslint-disable-next-line @next/next/no-img-element -- avatar URLs come from arbitrary hosts
                <img
                  src={person.picture}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : initials ? (
                initials
              ) : (
                <User className="h-6 w-6" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-gray-500 dark:text-gray-400 sm:text-sm">
                {role && (
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                    {role}
                  </span>
                )}
                {/* Reserve the line so the panel doesn't jump when the date arrives. */}
                <span className="min-h-[1.25em]">{clock?.date ?? " "}</span>
              </div>

              {headingReady ? (
                <h1
                  id="welcome-heading"
                  className="mt-1.5 text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl"
                >
                  {heading}
                </h1>
              ) : (
                <>
                  <h1 id="welcome-heading" className="sr-only">
                    Welcome
                  </h1>
                  <div
                    aria-hidden="true"
                    className="mt-2 h-8 w-56 animate-pulse rounded-md bg-gray-200 dark:bg-white/10 sm:h-9 sm:w-72"
                  />
                </>
              )}

              <p className="mt-1.5 max-w-xl text-sm text-gray-600 dark:text-gray-400 sm:text-base">
                {description}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
            {shortcuts.map((action, index) => {
              const Icon = action.icon;
              const primary = index === 0;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className={
                    primary
                      ? `group inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold text-white shadow-md transition hover:shadow-lg ${focusRing}`
                      : `group inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 dark:border-white/15 dark:bg-white/5 dark:text-gray-100 dark:hover:bg-white/10 ${focusRing}`
                  }
                  style={
                    primary ? { background: REVA_GRADIENTS.primary } : undefined
                  }
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {action.label}
                  {primary && (
                    <ArrowRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="relative flex flex-col gap-2 border-t border-gray-100 bg-gray-50/70 px-5 py-3.5 text-sm text-gray-600 dark:border-white/10 dark:bg-white/2 dark:text-gray-400 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          {tips.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {tips.map((tip) => (
                <li key={tip} className="flex items-start gap-2">
                  <Info
                    className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400"
                    aria-hidden
                  />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          ) : (
            <span aria-hidden="true" />
          )}
          <Link
            href="/reva/contact"
            className={`inline-flex items-center gap-1.5 self-start rounded font-medium text-blue-700 hover:underline dark:text-blue-300 sm:self-auto ${focusRing}`}
          >
            <LifeBuoy className="h-4 w-4" aria-hidden />
            Need help? Contact support
          </Link>
        </div>
      </div>
    </section>
  );
}
