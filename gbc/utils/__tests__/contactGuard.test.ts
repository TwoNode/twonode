import { describe, expect, it } from "vitest";
import {
  checkContactGuard,
  MAX_FILL_TIME_MS,
  MIN_FILL_TIME_MS,
} from "@/gbc/utils/contactGuard";

describe("checkContactGuard", () => {
  it("lets a normal submission through", () => {
    expect(checkContactGuard({ fax: "", fillTimeMs: 45_000 })).toBe("ok");
    expect(checkContactGuard({ fillTimeMs: 45_000 })).toBe("ok");
  });

  it("treats a filled honeypot as a script, whatever the fill time", () => {
    expect(checkContactGuard({ fax: "x", fillTimeMs: 45_000 })).toBe(
      "honeypot"
    );
    expect(checkContactGuard({ fax: " 123 ", fillTimeMs: 10 })).toBe(
      "honeypot"
    );
  });

  it("ignores a honeypot that holds only spaces", () => {
    expect(checkContactGuard({ fax: "   ", fillTimeMs: 45_000 })).toBe("ok");
  });

  it("rejects a submission faster than a person can fill the form", () => {
    // The script seen on 2026-11-02 posted 1.7 to 2.3 seconds after the page loaded.
    expect(checkContactGuard({ fillTimeMs: 2300 })).toBe("too-fast");
    expect(checkContactGuard({ fillTimeMs: MIN_FILL_TIME_MS - 1 })).toBe(
      "too-fast"
    );
    expect(checkContactGuard({ fillTimeMs: MIN_FILL_TIME_MS })).toBe("ok");
  });

  it("rejects a missing, negative, huge or non-finite fill time", () => {
    expect(checkContactGuard({})).toBe("too-fast");
    expect(checkContactGuard({ fillTimeMs: -5 })).toBe("too-fast");
    expect(checkContactGuard({ fillTimeMs: MAX_FILL_TIME_MS + 1 })).toBe(
      "too-fast"
    );
    expect(checkContactGuard({ fillTimeMs: Number.NaN })).toBe("too-fast");
    expect(checkContactGuard({ fillTimeMs: Infinity })).toBe("too-fast");
  });
});
