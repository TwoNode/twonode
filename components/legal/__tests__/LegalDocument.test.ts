import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LegalDocument } from "../LegalDocument";
import { LEGAL_EFFECTIVE_DATE, SURFBOARD_PRIVACY } from "@/lib/legal/surfboard";
import { SURFBOARD_SUPPORT } from "@/lib/legal/surfboardSupport";

const render = (doc: typeof SURFBOARD_SUPPORT, showEffectiveDate?: boolean) =>
  renderToStaticMarkup(
    createElement(LegalDocument, {
      doc,
      backHref: "/surfboard",
      backLabel: "Surfboard",
      otherHref: "/surfboard/privacy",
      otherLabel: "Read the Privacy Policy",
      showEffectiveDate,
    })
  );

describe("LegalDocument", () => {
  it("shows the effective date by default, as the Privacy Policy and Terms need", () => {
    expect(render(SURFBOARD_PRIVACY)).toContain(
      `Effective ${LEGAL_EFFECTIVE_DATE}`
    );
  });

  it("leaves the effective date out of the support page, which has none", () => {
    const html = render(SURFBOARD_SUPPORT, false);
    expect(html).not.toContain("Effective");
    expect(html).toContain("Surfboard support");
    expect(html).toContain("Delete my account");
    expect(html).toContain("info@twonodetechnologies.com");
  });
});
