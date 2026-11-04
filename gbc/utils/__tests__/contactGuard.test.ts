import { describe, expect, it } from "vitest";
import {
  checkContactGuard,
  fillTimeSince,
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

describe("fillTimeSince (what the form sends)", () => {
  const T0 = 1_700_000_000_000;

  it("is the time since the page opened", () => {
    expect(fillTimeSince(T0, T0 + 45_000)).toBe(45_000);
  });

  it("is held at the most the server accepts, so a page left open for days can still send", () => {
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    expect(fillTimeSince(T0, T0 + threeDays)).toBe(MAX_FILL_TIME_MS);
    // ...and what it reports is accepted by the guard itself.
    expect(
      checkContactGuard({ fillTimeMs: fillTimeSince(T0, T0 + threeDays) })
    ).toBe("ok");
    expect(
      checkContactGuard({
        fillTimeMs: fillTimeSince(T0, T0 + MAX_FILL_TIME_MS),
      })
    ).toBe("ok");
  });

  it("reports 0 before the form has mounted (not the time since 1970), and 0 for a clock that went backwards", () => {
    expect(fillTimeSince(0, T0)).toBe(0);
    expect(checkContactGuard({ fillTimeMs: fillTimeSince(0, T0) })).toBe(
      "too-fast"
    );
    expect(fillTimeSince(T0, T0 - 5_000)).toBe(0);
  });

  it("still reports a quick send as quick", () => {
    expect(
      checkContactGuard({ fillTimeMs: fillTimeSince(T0, T0 + 1_000) })
    ).toBe("too-fast");
  });
});
