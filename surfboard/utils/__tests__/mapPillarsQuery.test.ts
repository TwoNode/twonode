import { describe, expect, it } from "vitest";
import { ValidationError } from "@/lib/api/errors";
import {
  MAP_PILLAR_PLAN_LIMIT,
  parseMapPillarsQuery,
} from "@/surfboard/utils/mapPillarsQuery";

const q = (ids?: string) =>
  new URLSearchParams(ids === undefined ? {} : { ids });

describe("parseMapPillarsQuery", () => {
  it("reads a comma separated list of plan ids", () => {
    expect(parseMapPillarsQuery(q("a1,b2, c3 "))).toEqual({
      ids: ["a1", "b2", "c3"],
    });
  });

  it("asks about a repeated id once", () => {
    expect(parseMapPillarsQuery(q("a1,b2,a1"))).toEqual({ ids: ["a1", "b2"] });
  });

  it("accepts the largest list it allows", () => {
    const ids = Array.from(
      { length: MAP_PILLAR_PLAN_LIMIT },
      (_, i) => `p${i}`
    );
    expect(parseMapPillarsQuery(q(ids.join(","))).ids).toHaveLength(
      MAP_PILLAR_PLAN_LIMIT
    );
  });

  it.each([
    ["no ids", undefined],
    ["an empty list", ""],
    ["an empty entry", "a1,,b2"],
    ["an id with a character a plan id never has", "a1,../x"],
    ["an id longer than 100 characters", "a".repeat(101)],
    [
      "one more than the limit",
      Array.from({ length: MAP_PILLAR_PLAN_LIMIT + 1 }, (_, i) => `p${i}`).join(
        ","
      ),
    ],
  ])("refuses %s with a 400", (_name, ids) => {
    expect(() => parseMapPillarsQuery(q(ids))).toThrow(ValidationError);
  });
});
