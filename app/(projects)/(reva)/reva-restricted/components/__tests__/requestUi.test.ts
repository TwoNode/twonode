import { describe, expect, it } from "vitest";
import { documentLabel, toneForPayment, toneForStatus } from "../requestUi";

describe("requestUi", () => {
  it("tones match what the list showed before the redesign", () => {
    expect(toneForStatus("Completed")).toBe("success");
    expect(toneForStatus("Available")).toBe("success");
    expect(toneForStatus("Processing")).toBe("warning");
    expect(toneForStatus("Pending")).toBe("info");
    expect(toneForStatus(null)).toBe("info");
    expect(toneForPayment("Paid")).toBe("success");
    expect(toneForPayment("Unpaid")).toBe("error");
    expect(toneForPayment(undefined)).toBe("info");
  });

  it("documentLabel gives a readable name", () => {
    expect(
      documentLabel(
        "private/reva/uploads/1760000000000__ab12__Survey_Plan.pdf",
        0
      )
    ).toBe("Survey Plan");
    expect(documentLabel("https://x.test/a/Deed_of_sale.pdf?sig=1", 1)).toBe(
      "Deed of sale"
    );
    expect(documentLabel("", 2)).toBe("Document 3");
  });
});
