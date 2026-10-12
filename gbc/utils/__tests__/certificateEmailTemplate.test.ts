import { describe, expect, it } from "vitest";
import {
  buildCertificateEmailHtml,
  escapeHtml,
  formatEventDates,
} from "@/gbc/utils/certificateEmailTemplate";

const ticket = {
  ticketNumber: "GBC2_ABC123",
  name: "Jane Doe",
  checkedInAt: null,
  editionRef: {
    name: "GBC 2.0",
    theme: "Geospatial Capital",
    subTheme: "Driving Transformation",
    venue: "Eko Hotel & Suites, Lagos",
    startDate: new Date("2026-03-15T00:00:00Z"),
    endDate: new Date("2026-03-16T00:00:00Z"),
  },
};

const url = "https://example.com/gbc/verify/abc";

describe("formatEventDates", () => {
  it("formats single-day, same-month and cross-month ranges", () => {
    expect(
      formatEventDates("2026-03-15T00:00:00Z", "2026-03-15T00:00:00Z")
    ).toBe("15 March 2026");
    expect(
      formatEventDates("2026-03-15T00:00:00Z", "2026-03-16T00:00:00Z")
    ).toBe("15–16 March 2026");
    expect(
      formatEventDates("2026-03-28T00:00:00Z", "2026-04-02T00:00:00Z")
    ).toBe("28 March – 2 April 2026");
  });
});

describe("buildCertificateEmailHtml", () => {
  it("includes the verify link, the attendee and the event details", () => {
    const html = buildCertificateEmailHtml({
      ticket,
      customMessage: "Thanks for coming.",
      certificateUrl: url,
    });
    expect(html).toContain(`href="${url}"`);
    expect(html).toContain("Hi Jane,");
    expect(html).toContain("15–16 March 2026");
    expect(html).toContain("GBC2_ABC123");
  });

  it("prefers the frozen certificate fields over the live edition", () => {
    const html = buildCertificateEmailHtml({
      ticket: {
        ...ticket,
        certificateEventName: "Frozen Name",
        certificateVenue: "Frozen Venue",
      },
      customMessage: "x",
      certificateUrl: url,
    });
    expect(html).toContain("Frozen Name");
    expect(html).toContain("Frozen Venue");
    expect(html).not.toContain("Eko Hotel");
  });

  it("escapes attendee-supplied and admin-supplied text", () => {
    const html = buildCertificateEmailHtml({
      ticket: { ...ticket, name: '<script>alert(1)</script> "Eve"' },
      customMessage: "<img src=x onerror=alert(1)>\n\nSecond paragraph",
      certificateUrl: url,
    });
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x");
    expect(html.match(/Second paragraph/g)).toHaveLength(1);
  });

  it("escapeHtml covers the five special characters", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });
});
