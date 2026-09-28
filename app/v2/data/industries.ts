export interface IndustryProduct {
  name: string;
  tagline: string;
  description: string;
  /** Tailwind text/bg color token, e.g. "blue-600" — mirrors that product's own brand color. */
  accent: string;
  href: string;
}

export interface Industry {
  slug: string;
  name: string;
  /** Short positioning line — "Where we started.", "Where we're building next." */
  positioning: string;
  /** One paragraph: the industry's context and the friction TwoNode found in it. */
  context: string;
  products: IndustryProduct[];
  otherEcosystemWork?: string;
  status: "active" | "next";
}

/**
 * Seeded with the two industries named in the TwoNode Website PRB
 * (out/TwoNode Website.pdf). Adding a third industry later is a matter of
 * appending an entry here — the Industries section and the [slug] detail
 * page are both fully data-driven off this file, per the brief's "Future
 * Industries" requirement (no structural rework needed to add one).
 */
export const industries: Industry[] = [
  {
    slug: "surveying-geospatial",
    name: "Surveying & Geospatial",
    positioning: "Where we started.",
    context:
      "Survey plan records move through a chain of surveyors, ministries, lawyers and land buyers — and in most of the industry, that chain still runs on paper, on desks, in filing cabinets that flood, misfile and go missing. We spent time inside that world before we wrote a line of code: watching how a plan actually gets approved, queried, re-submitted, lost. The friction wasn't a lack of technology. It was a lack of a shared, trustworthy record.",
    products: [
      {
        name: "Surfboard",
        tagline: "Digital infrastructure for survey plan records.",
        description:
          "Surfboard is where survey plans get stored, accessed, verified and connected — turning a paper trail into a record every party in the chain can trust, from the surveyor who drew it to the ministry that approves it.",
        accent: "blue-600",
        href: "/surfboard",
      },
      {
        name: "GBC",
        tagline: "Bringing the people shaping the industry into the same conversation.",
        description:
          "Surfboard solves the record. GBC solves the room — the Geospatial Builders Conference is where surveyors, regulators and institutions in this industry actually talk to each other, not just to us.",
        accent: "purple-600",
        href: "/gbc",
      },
    ],
    otherEcosystemWork:
      "Workshops with state surveying agencies, and ongoing conversations with the ministries that sit downstream of every plan Surfboard stores.",
    status: "active",
  },
  {
    slug: "real-estate",
    name: "Real Estate",
    positioning: "Where we're building next.",
    context:
      "Buying property in a market where title history is scattered across registries, agents and word of mouth means due diligence is either slow, expensive, or skipped. We saw the same shape of problem we'd already learned in surveying — a chain of information nobody owns end to end — showing up again, one industry over.",
    products: [
      {
        name: "REVA",
        tagline: "Your due diligence just got intelligent.",
        description:
          "REVA is TwoNode's first product inside real estate: due diligence that pulls together the record a buyer actually needs, instead of leaving them to chase it across offices.",
        accent: "green-600",
        href: "/reva",
      },
    ],
    status: "next",
  },
];

export function getIndustry(slug: string): Industry | undefined {
  return industries.find((i) => i.slug === slug);
}
