export interface InsightPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  /** Draft placeholder — swap in real copy without touching the rendering components. */
  body: string[];
}

/**
 * "Inside TwoNode" is meant to feel like the company documenting what it's
 * learning (per the PRB), not a corporate blog kept for its own sake. There's
 * no CMS wired up yet — these are real drafts marked as such, seeded so the
 * section renders with genuine content instead of lorem ipsum. Replace body
 * copy directly here until an editorial workflow exists.
 */
export const insights: InsightPost[] = [
  {
    slug: "what-a-survey-plan-actually-goes-through",
    title: "What a survey plan actually goes through before it's approved",
    excerpt:
      "Before we wrote any code for Surfboard, we followed a single plan through the chain — surveyor, ministry, query, resubmission — to see where it actually breaks.",
    category: "Industry observations",
    date: "2026-06-12",
    body: [
      "Draft — to be replaced with the real write-up.",
      "The short version: the paper itself was never the bottleneck. Every delay we traced came from someone not knowing where a plan currently sat, or not trusting the copy they'd been handed was the latest one.",
    ],
  },
  {
    slug: "why-gbc-exists",
    title: "Why we built a conference instead of just a feature",
    excerpt:
      "Surfboard could have shipped a comments feature. Instead we built a room. Here's the difference, and why it mattered for this industry specifically.",
    category: "Founder perspectives",
    date: "2026-04-03",
    body: ["Draft — to be replaced with the real write-up."],
  },
  {
    slug: "the-second-industry",
    title: "The pattern we found in real estate was the one we already knew",
    excerpt:
      "REVA didn't start with a real-estate idea. It started with the same shape of problem we'd already learned inside surveying, one industry over.",
    category: "Product stories",
    date: "2026-08-19",
    body: ["Draft — to be replaced with the real write-up."],
  },
];

export function getInsight(slug: string): InsightPost | undefined {
  return insights.find((p) => p.slug === slug);
}
