import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { z } from "zod/v4";
import * as S from "@/lib/mobile/contract/schemas";

/**
 * Answers the real server gave, recorded against a throwaway database for the
 * app's own tests (the app keeps the same files). Every one must parse with
 * the schema in `schemas.ts` and come out unchanged: a schema that is too
 * tight rejects a real answer, and one that is too loose or missing a field
 * drops a key, which `toEqual` catches. This is also how a leaked field (an
 * email, a stored link) is noticed: it is not in the schema, so it is lost.
 */
const DIR = path.join(__dirname, "../__fixtures__");

const recorded = (name: string) =>
  JSON.parse(fs.readFileSync(path.join(DIR, name), "utf8")) as {
    status: number;
    body: unknown;
  };

const SUCCESSES: [string, z.ZodType][] = [
  ["batch-detail.json", S.BatchDetailData],
  ["batches-summary.active.json", S.BatchListData],
  ["batches-summary.history.json", S.BatchListData],
  ["coordinate-shifts.json", S.CoordinateShiftsData],
  ["plan-detail.lodged.json", S.PlanDetailData],
  ["plan-detail.owner.json", S.PlanDetailData],
  ["plan-detail.queried.json", S.PlanDetailData],
  ["plan-detail.shared.json", S.PlanDetailData],
  ["plans-counts.json", S.PlanCountsData],
  ["plans-map.json", S.PlanMapData],
  ["plans-map.empty.json", S.PlanMapData],
  ["plans-stats.json", S.PlanStatsData],
  ["plans-stats.empty.json", S.PlanStatsData],
  ["plans-stats.range.json", S.PlanStatsData],
  ["plans-summary.drill-ikeja.json", S.PlanListData],
  ["plans-summary.drill-lodged.json", S.PlanListData],
  ["plans-summary.empty.json", S.PlanListData],
  ["plans-summary.mine.json", S.PlanListData],
  ["plans-summary.queried.json", S.PlanListData],
  ["plans-summary.shared.json", S.PlanListData],
  ["profile-summary.json", S.ProfileSummaryData],
  ["subscription-summary.active.json", S.SubscriptionSummaryData],
  ["subscription-summary.ended.json", S.SubscriptionSummaryData],
  ["subscription-summary.ending.json", S.SubscriptionSummaryData],
  ["subscription-summary.grace.json", S.SubscriptionSummaryData],
  ["subscription-summary.none.json", S.SubscriptionSummaryData],
  ["wallet-summary.json", S.WalletSummaryData],
  ["wallet-summary.empty.json", S.WalletSummaryData],
];

const FAILURES: [string, number][] = [
  ["batch-detail.not-found.json", 404],
  ["plan-detail.not-found.json", 404],
  ["plans-stats.bad-range.json", 400],
  ["plans-summary.invalid.json", 400],
  ["unauthenticated.json", 401],
];

describe("recorded real answers", () => {
  it.each(SUCCESSES)("%s conforms and loses nothing", (file, data) => {
    const { status, body } = recorded(file);
    expect(status).toBe(200);
    const parsed = S.envelope(data).safeParse(body);
    expect(parsed.error?.issues).toBeUndefined();
    expect(parsed.data).toEqual(body);
  });

  it.each(FAILURES)("%s is the shared failure envelope", (file, status) => {
    const recordedAnswer = recorded(file);
    expect(recordedAnswer.status).toBe(status);
    const parsed = S.ErrorBody.safeParse(recordedAnswer.body);
    expect(parsed.error?.issues).toBeUndefined();
    expect(parsed.data).toEqual(recordedAnswer.body);
  });

  it("covers every recorded file", () => {
    const covered = new Set([
      ...SUCCESSES.map(([f]) => f),
      ...FAILURES.map(([f]) => f),
    ]);
    const onDisk = fs.readdirSync(DIR).filter((f) => f.endsWith(".json"));
    expect(onDisk.filter((f) => !covered.has(f))).toEqual([]);
  });
});
