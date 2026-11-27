/**
 * What a crash report from the Surfboard app looks like once it is stored, and the limits that
 * apply to it (ADR-0014 / TASK-0016). Types and constants only, so a client component (the admin
 * "App Reports" page) can import it without pulling in Prisma.
 */

export const APP_REPORT_KINDS = ["unexpected-close", "caught-error"] as const;
export type AppReportKind = (typeof APP_REPORT_KINDS)[number];

export const APP_REPORT_PLATFORMS = ["ios", "android"] as const;
export type AppReportPlatform = (typeof APP_REPORT_PLATFORMS)[number];

export const APP_REPORT_LIMITS = {
  /** A request over this many bytes is a 413 before it is parsed. */
  maxBodyBytes: 8 * 1024,
  /** Reports one account may post an hour. */
  perHour: 10,
  hourMs: 60 * 60 * 1000,
  /** How long a stored report is kept. */
  keepDays: 30,
  trailSteps: 24,
  trailStepChars: 90,
  appVersionChars: 32,
  osVersionChars: 16,
  screenChars: 60,
  errorNameChars: 60,
  errorMessageChars: 200,
  maxMemoryWarnings: 1000,
} as const;

/** One stored report, as the admin page receives it (dates are ISO strings on the wire). */
export interface AppReportEntry {
  id: string;
  receivedAt: string;
  kind: AppReportKind;
  appVersion: string;
  platform: AppReportPlatform;
  osVersion: string | null;
  screen: string;
  occurredAt: string;
  aliveAt: string | null;
  memoryWarnings: number | null;
  errorName: string | null;
  errorMessage: string | null;
  fatal: boolean | null;
  trail: string[];
}

export interface AppReportQuery {
  page?: number;
  pageSize?: number;
  kind?: string;
  platform?: string;
  appVersion?: string;
  /** Matches the screen, the error name or the error message. */
  search?: string;
}

export interface AppReportFilterOptions {
  kinds: string[];
  platforms: string[];
  appVersions: string[];
}
