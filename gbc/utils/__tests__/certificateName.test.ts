import { describe, expect, it } from "vitest";
import {
  fitName,
  nameWidthEm,
  NAME_MAX_SIZE,
  NAME_MAX_WIDTH_PT,
  NAME_MIN_SIZE,
} from "@/gbc/utils/certificateName";

const widest = (lines: string[]) => Math.max(...lines.map(nameWidthEm));
const fits = (name: string) => {
  const { size, lines } = fitName(name);
  return widest(lines) * size <= NAME_MAX_WIDTH_PT + 0.01;
};

describe("fitName", () => {
  it("keeps a short name on one line at full size", () => {
    expect(fitName("Ada Obi")).toEqual({
      size: NAME_MAX_SIZE,
      lines: ["Ada Obi"],
    });
  });

  it("shrinks a realistic four-part name instead of overflowing", () => {
    const name = "Muhammad Abdulrahman Ibrahim Olawale";
    const { size, lines } = fitName(name);
    expect(lines).toHaveLength(1);
    expect(size).toBeLessThan(NAME_MAX_SIZE);
    expect(fits(name)).toBe(true);
  });

  it("splits the longest real name seen on prod (67 characters) over two even lines", () => {
    const name =
      "Okedoyin Oluwamayowa Oyekanmi ( A.B Apatira and Associates Limited)";
    const { size, lines } = fitName(name);
    expect(lines).toHaveLength(2);
    expect(lines.join(" ")).toBe(
      "Okedoyin Oluwamayowa Oyekanmi (A.B Apatira and Associates Limited)"
    );
    expect(lines.some((l) => l.endsWith("("))).toBe(false);
    expect(size).toBeGreaterThanOrEqual(20);
    expect(fits(name)).toBe(true);
  });

  it("fits the 100-character maximum the forms allow", () => {
    const name = "Oluwaseyifunmitan Abimbola Olamilekan Adebayo-Ogunlesi "
      .repeat(2)
      .trim()
      .slice(0, 100);
    expect(name.length).toBe(100);
    expect(fits(name)).toBe(true);
  });

  it("shrinks a single unbroken long word rather than clipping it", () => {
    const name = "W".repeat(40);
    const { size, lines } = fitName(name);
    expect(lines).toEqual([name]);
    expect(size).toBeGreaterThanOrEqual(NAME_MIN_SIZE);
    expect(fits(name)).toBe(size > NAME_MIN_SIZE);
  });

  it("collapses stray whitespace and handles an empty name", () => {
    expect(fitName("  Ada   Obi ").lines).toEqual(["Ada Obi"]);
    expect(fitName("").lines).toEqual([""]);
  });

  it("measures characters outside the table with a safe wide fallback", () => {
    expect(nameWidthEm("漢")).toBeGreaterThan(0.9);
  });
});
