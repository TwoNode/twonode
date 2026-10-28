import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A cron route nobody schedules never runs, and a schedule with no route is a
 * deploy that calls a 404 every day. Either is easy to leave behind when a
 * cron is added or renamed, and nothing else would notice.
 */
const root = process.cwd();
const scheduled: { path: string; schedule: string }[] = JSON.parse(
  readFileSync(path.join(root, "vercel.json"), "utf8")
).crons;
const cronDir = path.join(root, "app/api/cron");
const routes = readdirSync(cronDir)
  .filter((name) => statSync(path.join(cronDir, name)).isDirectory())
  .filter((name) => name !== "__tests__")
  .map((name) => `/api/cron/${name}`);

describe("vercel.json crons", () => {
  it("schedules every cron route", () => {
    expect(routes.length).toBeGreaterThan(0);
    for (const route of routes) {
      expect(scheduled.map((c) => c.path)).toContain(route);
    }
  });

  it("schedules only routes that exist", () => {
    for (const cron of scheduled) {
      expect(routes).toContain(cron.path);
    }
  });

  it("schedules each route once", () => {
    const paths = scheduled.map((c) => c.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});
