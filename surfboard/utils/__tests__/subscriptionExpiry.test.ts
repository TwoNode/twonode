import { describe, expect, it } from "vitest";
import { EXPIRING_SOON_WINDOW_DAYS, subscriptionExpiry } from "../subscriptionExpiry";

const now = new Date("2026-09-21T12:00:00Z");
const daysFromNow = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

describe("subscriptionExpiry", () => {
  it("has no tone or date when the subscription has no end date", () => {
    expect(subscriptionExpiry(null, now)).toEqual({ tone: "none", date: null, relative: "" });
    expect(subscriptionExpiry(undefined, now).tone).toBe("none");
    expect(subscriptionExpiry("not a date", now).tone).toBe("none");
  });

  it("is expired once the end date has passed, counting whole days", () => {
    expect(subscriptionExpiry(daysFromNow(-3), now)).toMatchObject({ tone: "expired", relative: "3 days ago" });
    expect(subscriptionExpiry(daysFromNow(-1), now).relative).toBe("1 day ago");
    expect(subscriptionExpiry(new Date(now.getTime() - 60_000), now)).toMatchObject({ tone: "expired", relative: "today" });
  });

  it("is expiring soon inside the filter window, and ok beyond it", () => {
    expect(subscriptionExpiry(daysFromNow(2), now)).toMatchObject({ tone: "soon", relative: "in 2 days" });
    expect(subscriptionExpiry(daysFromNow(EXPIRING_SOON_WINDOW_DAYS), now).tone).toBe("soon");
    expect(subscriptionExpiry(daysFromNow(EXPIRING_SOON_WINDOW_DAYS + 1), now)).toMatchObject({ tone: "ok" });
    expect(subscriptionExpiry(daysFromNow(40), now).relative).toBe("in 40 days");
  });

  it("does not call the last day 'in 0 days'", () => {
    expect(subscriptionExpiry(daysFromNow(0.5), now)).toMatchObject({ tone: "soon", relative: "today or tomorrow" });
  });

  it("accepts an ISO string, as it arrives over the API", () => {
    expect(subscriptionExpiry(daysFromNow(10).toISOString(), now).tone).toBe("ok");
  });
});
