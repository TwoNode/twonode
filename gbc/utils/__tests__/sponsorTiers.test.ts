import { describe, expect, it } from "vitest";
import {
  groupSponsorsByTier,
  isTierSize,
  sortTiers,
  tierKeyFromName,
} from "../sponsorTiers";

const tier = (key: string, order: number, name = key) => ({
  key,
  name,
  size: "STANDARD",
  order,
});

describe("tierKeyFromName", () => {
  it("makes an UPPER_SNAKE key", () => {
    expect(tierKeyFromName("Gold Partner")).toBe("GOLD_PARTNER");
    expect(tierKeyFromName("  Media & Broadcast Partners! ")).toBe(
      "MEDIA_BROADCAST_PARTNERS"
    );
  });

  it("drops accents instead of leaving holes", () => {
    expect(tierKeyFromName("Café Sponsors")).toBe("CAFE_SPONSORS");
  });

  it("keeps the three original keys when given their plain names", () => {
    expect(tierKeyFromName("Headline")).toBe("HEADLINE");
    expect(tierKeyFromName("impact")).toBe("IMPACT");
  });

  it("returns an empty key when nothing usable is left", () => {
    expect(tierKeyFromName("!!! ???")).toBe("");
    expect(tierKeyFromName("")).toBe("");
  });

  it("caps the length without leaving a trailing underscore", () => {
    const key = tierKeyFromName(
      "Alpha Beta Gamma Delta Epsilon Zeta Eta Theta Iota Kappa"
    );
    expect(key.length).toBeLessThanOrEqual(40);
    expect(key.endsWith("_")).toBe(false);
  });
});

describe("isTierSize", () => {
  it("accepts the three card sizes only", () => {
    expect(["FEATURED", "STANDARD", "COMPACT"].every(isTierSize)).toBe(true);
    expect(isTierSize("HUGE")).toBe(false);
  });
});

describe("sortTiers", () => {
  it("orders by order, then name", () => {
    const sorted = sortTiers([
      tier("B", 1, "Bravo"),
      tier("C", 0, "Charlie"),
      tier("A", 1, "Alpha"),
    ]);
    expect(sorted.map((t) => t.key)).toEqual(["C", "A", "B"]);
  });

  it("does not mutate its input", () => {
    const input = [tier("B", 1), tier("A", 0)];
    sortTiers(input);
    expect(input.map((t) => t.key)).toEqual(["B", "A"]);
  });
});

describe("groupSponsorsByTier", () => {
  const tiers = [
    tier("SUPPORTING", 2),
    tier("HEADLINE", 0),
    tier("GOLD", 1),
    tier("EMPTY", 3),
  ];
  const sponsors = [
    { id: "1", tier: "SUPPORTING" },
    { id: "2", tier: "HEADLINE" },
    { id: "3", tier: "GOLD" },
    { id: "4", tier: "HEADLINE" },
  ];

  it("groups in tier order and drops tiers with no sponsors", () => {
    const groups = groupSponsorsByTier(tiers, sponsors);
    expect(groups.map((g) => g.tier.key)).toEqual([
      "HEADLINE",
      "GOLD",
      "SUPPORTING",
    ]);
    expect(groups[0].sponsors.map((s) => s.id)).toEqual(["2", "4"]);
  });

  it("can include empty tiers (the admin view needs them)", () => {
    expect(
      groupSponsorsByTier(tiers, sponsors, { includeEmpty: true }).map(
        (g) => g.tier.key
      )
    ).toEqual(["HEADLINE", "GOLD", "SUPPORTING", "EMPTY"]);
  });

  it("never loses a sponsor whose tier is unknown", () => {
    const groups = groupSponsorsByTier(tiers, [
      ...sponsors,
      { id: "9", tier: "GHOST" },
    ]);
    const last = groups[groups.length - 1];
    expect(last.tier.key).toBe("GHOST");
    expect(last.sponsors.map((s) => s.id)).toEqual(["9"]);
  });
});
