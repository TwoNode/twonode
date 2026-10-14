import { describe, expect, it } from "vitest";
import {
  expiryReminderEmail,
  friendlyName,
  subscriptionThanksEmail,
} from "../subscriptionEmails";

describe("friendlyName", () => {
  it("fixes all-caps and all-lowercase, keeps mixed case", () => {
    expect(friendlyName("USMAN")).toBe("Usman");
    expect(friendlyName("usman")).toBe("Usman");
    expect(friendlyName("McDonald")).toBe("McDonald");
    expect(friendlyName("")).toBe("there");
    expect(friendlyName(null)).toBe("there");
  });
});

describe("expiryReminderEmail", () => {
  const expiresAt = new Date("2026-10-15T12:00:00Z");
  it("uses the agreed subject and lines, with the date written out", () => {
    const m = expiryReminderEmail({
      firstName: "USMAN",
      daysLeft: 3,
      expiresAt,
      renewUrl: "https://x.test/renew",
    });
    expect(m.subject).toBe("Keep your Survey Practice one step ahead");
    expect(m.text).toContain("Hi Usman,");
    expect(m.text).toContain("Great work gets you recommended.");
    expect(m.text).toContain(
      "Your subscription expires in 3 days, on October 15, 2026."
    );
    expect(m.html).toContain('href="https://x.test/renew"');
    expect(m.html).toContain(">Renew<");
  });
  it("says today and singular days correctly", () => {
    const base = { firstName: "Ada", expiresAt, renewUrl: "u" };
    expect(expiryReminderEmail({ ...base, daysLeft: 0 }).text).toContain(
      "expires today, October 15, 2026."
    );
    expect(expiryReminderEmail({ ...base, daysLeft: 1 }).text).toContain(
      "expires in 1 day, on"
    );
  });
});

describe("subscriptionThanksEmail", () => {
  it("uses the agreed subject, lines and button", () => {
    const m = subscriptionThanksEmail({
      firstName: "Usman",
      dashboardUrl: "https://x.test/surfboard/dashboard",
    });
    expect(m.subject).toBe("Thank you for choosing Surfboard");
    expect(m.text).toContain("Thank you for choosing Surfboard.");
    expect(m.text).toContain(
      "Here’s to great work and the relationships it builds."
    );
    expect(m.html).toContain(">Explore Surfboard<");
    expect(m.html).toContain('href="https://x.test/surfboard/dashboard"');
  });
  it("escapes a name that carries markup", () => {
    const m = subscriptionThanksEmail({ firstName: "<b>x", dashboardUrl: "u" });
    expect(m.html).not.toContain("<b>x");
  });
});
