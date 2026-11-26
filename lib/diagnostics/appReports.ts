import { z } from "zod";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/observability/logger";
import { paginateQuery } from "@/lib/api/pagination";
import {
  APP_REPORT_KINDS,
  APP_REPORT_LIMITS as L,
  APP_REPORT_PLATFORMS,
  type AppReportFilterOptions,
  type AppReportEntry,
  type AppReportKind,
  type AppReportPlatform,
  type AppReportQuery,
} from "@/lib/diagnostics/appReportTypes";
import { scrubOptional, scrubReportText } from "@/lib/diagnostics/scrubReport";

/**
 * Crash reports from the Surfboard app (ADR-0014 / TASK-0016). The route validates and rate-limits;
 * this file scrubs, stores (a table, kept 30 days, purged on write) and reads them back for the
 * superadmin "App Reports" page. No account id is stored or logged anywhere here (D3).
 */

/** Off unless `APP_REPORTS_ENABLED` is exactly "1" (the same style of switch as `PUSH_ENABLED`). */
export function appReportsEnabled(
  env: Record<string, string | undefined> = process.env
): boolean {
  return env.APP_REPORTS_ENABLED === "1";
}

const isoTime = z.string().datetime({ offset: true });

/** What the app may send. `.strict()` everywhere: an unknown key is a 400. */
export const appReportSchema = z
  .object({
    v: z.literal(1),
    kind: z.enum(APP_REPORT_KINDS),
    appVersion: z.string().max(L.appVersionChars),
    platform: z.enum(APP_REPORT_PLATFORMS),
    osVersion: z.string().max(L.osVersionChars).optional(),
    screen: z.string().max(L.screenChars),
    at: isoTime,
    aliveAt: isoTime.optional(),
    memoryWarnings: z.number().int().min(0).max(L.maxMemoryWarnings).optional(),
    error: z
      .object({
        name: z.string().max(L.errorNameChars),
        message: z.string().max(L.errorMessageChars),
        fatal: z.boolean(),
      })
      .strict()
      .optional(),
    trail: z.array(z.string().max(L.trailStepChars)).max(L.trailSteps),
  })
  .strict();

export type AppReportInput = z.infer<typeof appReportSchema>;

/** The report with every text field scrubbed again, shaped for the table. */
export function scrubAppReport(input: AppReportInput) {
  return {
    kind: input.kind,
    appVersion: scrubReportText(input.appVersion, L.appVersionChars),
    platform: input.platform,
    osVersion: scrubOptional(input.osVersion, L.osVersionChars),
    screen: scrubReportText(input.screen, L.screenChars),
    occurredAt: new Date(input.at),
    aliveAt: input.aliveAt ? new Date(input.aliveAt) : null,
    memoryWarnings: input.memoryWarnings ?? null,
    errorName: scrubOptional(input.error?.name, L.errorNameChars),
    errorMessage: scrubOptional(input.error?.message, L.errorMessageChars),
    fatal: input.error?.fatal ?? null,
    trail: input.trail
      .map((step) => scrubReportText(step, L.trailStepChars))
      .filter((step) => step.length > 0),
  };
}

/** About one request in this many also deletes what is past its 30 days. */
const PURGE_ONE_IN = 20;

/** Deletes reports older than the keep period. Never throws: a failed purge must not fail a report. */
export async function purgeOldAppReports(now = new Date()): Promise<void> {
  try {
    const before = new Date(now.getTime() - L.keepDays * 24 * 60 * 60 * 1000);
    await prisma.surfboardAppReport.deleteMany({
      where: { receivedAt: { lt: before } },
    });
  } catch (err) {
    logger.warn("app-report purge failed", {}, err);
  }
}

/**
 * Scrubs, stores and logs one report, and now and then purges the old ones. The log line carries the
 * same fields as the row (JSON, so a field can never break a line) and no account id.
 */
export async function storeAppReport(
  input: AppReportInput,
  random: () => number = Math.random
): Promise<void> {
  const report = scrubAppReport(input);
  await prisma.surfboardAppReport.create({ data: report });
  logger.warn("app-report", {
    ...report,
    occurredAt: report.occurredAt.toISOString(),
    aliveAt: report.aliveAt?.toISOString() ?? null,
  });
  if (random() * PURGE_ONE_IN < 1) await purgeOldAppReports();
}

type Row = {
  id: string;
  receivedAt: Date;
  kind: string;
  appVersion: string;
  platform: string;
  osVersion: string | null;
  screen: string;
  occurredAt: Date;
  aliveAt: Date | null;
  memoryWarnings: number | null;
  errorName: string | null;
  errorMessage: string | null;
  fatal: boolean | null;
  trail: unknown;
};

function toEntry(row: Row): AppReportEntry {
  return {
    id: row.id,
    receivedAt: row.receivedAt.toISOString(),
    kind: row.kind as AppReportKind,
    appVersion: row.appVersion,
    platform: row.platform as AppReportPlatform,
    osVersion: row.osVersion,
    screen: row.screen,
    occurredAt: row.occurredAt.toISOString(),
    aliveAt: row.aliveAt?.toISOString() ?? null,
    memoryWarnings: row.memoryWarnings,
    errorName: row.errorName,
    errorMessage: row.errorMessage,
    fatal: row.fatal,
    // The column is JSON: read it defensively, and as plain strings.
    trail: Array.isArray(row.trail)
      ? row.trail.filter((s): s is string => typeof s === "string")
      : [],
  };
}

/** The superadmin list: newest first, filtered, paginated. */
export async function listAppReports(query: AppReportQuery = {}) {
  const { page = 1, pageSize = 10, kind, platform, appVersion, search } = query;
  const where: Record<string, unknown> = {};
  if (kind) where.kind = kind;
  if (platform) where.platform = platform;
  if (appVersion) where.appVersion = appVersion;
  if (search) {
    where.OR = [
      { screen: { contains: search, mode: "insensitive" } },
      { errorName: { contains: search, mode: "insensitive" } },
      { errorMessage: { contains: search, mode: "insensitive" } },
    ];
  }
  const result = await paginateQuery(
    (skip, take) =>
      prisma.surfboardAppReport.findMany({
        where,
        orderBy: { receivedAt: "desc" },
        skip,
        take,
      }),
    () => prisma.surfboardAppReport.count({ where }),
    page,
    pageSize
  );
  return { ...result, data: result.data.map(toEntry) };
}

/** What the filter drop-downs offer: the fixed kinds and platforms, and the app versions seen. */
export async function getAppReportFilterOptions(): Promise<AppReportFilterOptions> {
  const versions = await prisma.surfboardAppReport.findMany({
    distinct: ["appVersion"],
    select: { appVersion: true },
    orderBy: { appVersion: "desc" },
    take: 50,
  });
  return {
    kinds: [...APP_REPORT_KINDS],
    platforms: [...APP_REPORT_PLATFORMS],
    appVersions: versions.map((v: { appVersion: string }) => v.appVersion),
  };
}
