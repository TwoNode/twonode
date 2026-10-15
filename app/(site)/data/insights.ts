export interface InsightSection {
  /** Anchor id; also what the "IN THIS ARTICLE" index links to. */
  id: string;
  /** Short name used in the index and the eyebrow. */
  label: string;
  /** The section's own heading, shown as the h2. */
  heading: string;
  paragraphs: string[];
}

export interface InsightPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  /** Opening paragraphs, shown before the first section. */
  intro: string[];
  sections: InsightSection[];
}

/**
 * "Inside TwoNode" is meant to feel like the company documenting what it's
 * learning (per the PRB), not a corporate blog kept for its own sake. There's
 * no CMS wired up yet, so the articles live here. Edit the copy directly until
 * an editorial workflow exists.
 */
export const insights: InsightPost[] = [
  {
    slug: "what-a-survey-plan-actually-goes-through",
    title: "What a survey plan actually goes through before it's lodged",
    excerpt:
      "Where a survey plan goes after the surveyor has prepared it, and where the process slows down.",
    category: "Industry observations",
    date: "2026-06-12",
    intro: [
      "Before we built Surfboard, we wanted to understand what happens to a survey plan after the surveyor has prepared it. What we found was a process that depends on several people handling the same information, often through manual steps.",
    ],
    sections: [
      {
        id: "record-copy",
        label: "The record copy",
        heading: "It starts with a record copy",
        paragraphs: [
          "When a surveyor completes a survey plan, the work does not end with preparing the drawing.",
          "A record copy must be prepared for submission to the Office of the Surveyor General. The surveyor also prepares a formal letter addressed to the office, accompanying the record copy for lodging.",
          "From there, the plan enters an administrative process that varies across states but generally involves several stages of validation, assessment, payment and technical review.",
          "This is where the journey becomes more complicated.",
        ],
      },
      {
        id: "before-lodging",
        label: "Before lodging",
        heading: "Before the plan can be lodged",
        paragraphs: [
          "One of the first steps is validating the survey numbers.",
          "These numbers, including the pillar numbers shown on the plan, need to be checked against the relevant records to establish that they correspond with the survey job and the survey information presented.",
          "This is an important part of maintaining the integrity of survey records. The details on a submitted plan must be checked against the information available to the responsible office.",
          "But the validation process involves manually examining and comparing information.",
          "The plan then moves to assessment. Government fees are calculated according to the applicable scale of fees, which may depend on factors such as the size of the survey and the zone in which it falls.",
          "Because each state has its own processes and requirements, the specific procedure and applicable fees can differ. Within a state, the assessment itself can involve manually checking the plan against the relevant criteria.",
          "Once the assessment is completed, payment is made to the government. That payment must then be verified before the process can continue.",
          "The plan proceeds to further technical review, where officers examine it for discrepancies and other issues that may need to be resolved.",
          "If a problem is identified, a query is raised and sent back to the surveyor for attention.",
          "Each stage serves a purpose. The office must validate records, collect the appropriate fees and ensure that the survey information meets the necessary requirements.",
          "The difficulty lies in how these stages are handled and how information moves between them.",
        ],
      },
      {
        id: "information-stops",
        label: "Where it stalls",
        heading: "When information stops moving",
        paragraphs: [
          "Consider what this process requires.",
          "Pillar numbers must be checked. Fees must be assessed. Payments must be verified. Technical details must be reviewed. Queries must reach the surveyor, and responses must find their way back into the review process.",
          "When these activities depend on manual handling, the process becomes difficult to track from the outside.",
          "A surveyor may have submitted a record copy without having a clear view of its current stage. If a query is raised, getting access to that query and understanding what needs to be done can become another challenge.",
          "The surveyor may not know whether the plan is awaiting assessment, payment verification, technical review or a response to an outstanding issue.",
          "Each stage can create another point at which the process slows down.",
          "The problem is not that these checks are unnecessary. It is that the people involved need a more efficient way to exchange information, keep track of progress and respond when something requires their attention.",
          "And when the process takes longer, the consequences extend beyond the surveyor and the government office.",
        ],
      },
      {
        id: "bigger-process",
        label: "The bigger process",
        heading: "A survey plan is part of a much bigger process",
        paragraphs: [
          "Survey plans play an important role in land administration. They provide technical information about land parcels and form part of the documentation required for many land-related transactions and title processes.",
          "Where a survey plan must be lodged before the next stage of documentation can proceed, delays in lodging can affect the wider process.",
          "The scale of Nigeria's wider land documentation challenge is significant. In September 2024, the Federal Ministry of Housing and Urban Development reported that more than 90% of the country's land was unregistered and untitled, with experts estimating the resulting dead capital at over US$300 billion.",
          "For landowners, the absence of formal documentation can make it difficult to use their land as an economic asset, including as collateral for loans and investments.",
          "Improving the process of lodging survey plans will not, by itself, resolve Nigeria's land documentation challenges. But it addresses one part of the system on which formal land registration and titling depend.",
          "For us, that was an important distinction. We did not need to solve every problem in land administration to identify a meaningful place to start.",
          "We needed to understand the part of the process we could help improve.",
        ],
      },
      {
        id: "record-moves",
        label: "Moving with the plan",
        heading: "What if the record could move with the plan?",
        paragraphs: [
          "We began thinking about what would change if surveyors maintained their survey plan records in a structured digital format and could submit the relevant information electronically.",
          "Instead of government officers manually re-entering details from submitted plans into their own databases, the required data could be transferred digitally for review.",
          "Officers could access the submitted information, carry out the necessary checks and raise queries through a connected workflow. Surveyors could receive those queries, make corrections and respond without having to rely on a process that is difficult to track.",
          "The required technical checks, fee assessments and payment verification would still matter. Digital submission would not remove the need for government oversight. It could, however, reduce avoidable manual handling and make the stages of the process easier to track.",
          "That possibility shaped our thinking about Surfboard.",
        ],
      },
      {
        id: "starting-with-the-record",
        label: "Starting with the record",
        heading: "Starting with the record",
        paragraphs: [
          "Surfboard began with a practical question: how can surveyors organise their survey plan records in a way that makes them easier to manage, retrieve and use?",
          "Structured digital records create a foundation for more connected workflows. Information that is organised from the outset is better positioned to move between the people and systems that need it.",
          "This is also why we see the opportunity beyond record keeping alone. A more efficient digital process for submitting record copies could help surveyors and government offices work with the same information, reduce unnecessary repetition and make the progress of a submission more visible.",
          "There is still work to be done across the wider land administration system. Different states have different processes, requirements and systems. Any solution must account for those realities.",
          "But understanding the existing process gives us a place to begin.",
          "Before writing code, we needed to understand what the survey plan goes through after it leaves the surveyor's desk.",
          "That understanding continues to guide how we build at TwoNode Technologies.",
        ],
      },
    ],
  },
  {
    slug: "why-gbc-exists",
    title: "Why we built a conference instead of just a feature",
    excerpt:
      "A comments feature looked like the obvious next step. Here is why we built a room instead.",
    category: "Founder perspectives",
    date: "2026-04-03",
    intro: [
      "When we started thinking about how people using Surfboard could communicate, a comments feature seemed like the obvious next step.",
      "Someone finds a survey plan. They have a question. They need to reach the person who handled it. Give them a way to leave a comment, and the problem looks solved.",
      "But the more we thought about it, the more we realised that the problem went beyond communication.",
      "Surveying is a profession built on relationships, shared knowledge, and years of experience. Yet, much of that knowledge lives in individual offices, personal networks, and conversations that happen long after the actual work is done.",
      "A comments feature could help people exchange messages. It could not, on its own, bring an industry closer together.",
      "So we started asking a different question.",
      "What if the thing missing wasn't another way to communicate, but a reason to come together?",
    ],
    sections: [
      {
        id: "problem-behind-the-problem",
        label: "The real problem",
        heading: "The problem behind the problem",
        paragraphs: [
          "Building Surfboard has taught us that the problems people experience at work rarely exist in isolation.",
          "A survey plan passes through different hands. Information moves between people and institutions. Decisions depend on records, processes, and the people who understand them. Yet, everyone sees only a part of the bigger picture.",
          "We could build tools to make individual tasks easier. That mattered, and it still does.",
          "But we also began to see the value in creating opportunities for people to understand how others worked, share what they knew, and discuss the challenges they had in common.",
          "Some problems need better software. Others need better coordination. And sometimes, progress begins when the right people finally have a chance to talk.",
          "We wanted to make room for that, too.",
        ],
      },
      {
        id: "a-room",
        label: "The room",
        heading: "So we built a room",
        paragraphs: [
          "That thinking led us to GBC.",
          "Rather than treating communication as another feature to add to Surfboard, we chose to create a conference where people in the industry could come together.",
          "It was a different kind of solution, and it asked something different of us.",
          "Software can be designed, tested, and released. Bringing people together requires understanding what matters to them, earning their attention, and creating an experience worth showing up for.",
          "We had to think beyond the product itself. Who needed to be in the room? What conversations were worth having? What could people learn from one another that they might not discover working alone?",
          "These questions mattered because the goal was not simply to organise an event. It was to create an opportunity for something useful to happen between people.",
        ],
      },
      {
        id: "between-the-features",
        label: "Between features",
        heading: "What happens between the features matters",
        paragraphs: [
          "Technology is good at giving people tools. But tools operate within a much larger world of relationships, habits, institutions, and decisions.",
          "A feature might help two people exchange information. A gathering might help them understand each other's work well enough to collaborate differently afterward.",
          "Neither replaces the other. They solve different parts of the problem.",
          "This is an important distinction in how we think about building at TwoNode. We do not want to assume that every industry problem needs a software solution just because we are a technology company.",
          "Sometimes the answer is software. Sometimes it is a better workflow. Sometimes it is bringing the right people into the same room.",
          "Sometimes it takes all three.",
          "The work begins with understanding what is actually missing, even when the answer sits outside the product we are building.",
        ],
      },
      {
        id: "for-the-industry",
        label: "Beyond the interface",
        heading: "Building for the industry, not just the interface",
        paragraphs: [
          "GBC reminded us that building for an industry means looking beyond the moments when someone opens an app.",
          "It means paying attention to how people learn, how trust develops, where knowledge gets lost, and what makes collaboration difficult in the first place.",
          "Those things may not always appear on a product roadmap. They may not fit neatly into a feature list. But they influence whether the systems we build become genuinely useful.",
          "For us, this is part of the work.",
          "Surfboard helps surveyors organise and access survey plan records. GBC creates space for people in the industry to meet and exchange ideas. They take different forms, but both come from the same starting point: understanding the people, processes, and connections that shape how an industry works.",
          "We are still learning what that requires.",
          "But one thing has become clearer to us. Sometimes, the most useful thing we can build is not another feature.",
          "Sometimes, it is the space for something else to begin.",
        ],
      },
    ],
  },
  {
    slug: "the-second-industry",
    title: "The pattern we found in real estate was the one we already knew",
    excerpt: "The idea behind REVA started in surveying, one industry over.",
    category: "Product stories",
    date: "2026-08-19",
    intro: [
      "REVA didn't start with a real-estate idea.",
      "It started with a problem we had already spent time understanding in surveying.",
      "While building Surfboard, we began to see how difficult it could be to make confident decisions when the information needed to support those decisions was scattered across different records, people, and institutions.",
      "Finding a survey plan was one thing. Understanding what it meant, establishing its relevance, and connecting it to the other information needed to make a decision were different challenges altogether.",
      "The deeper we went into surveying, the more we understood that access to information was only part of the problem.",
      "People needed to be able to make sense of that information, too.",
      "We carried that lesson with us.",
    ],
    sections: [
      {
        id: "familiar-problem",
        label: "A familiar problem",
        heading: "A familiar problem in a different industry",
        paragraphs: [
          "When we began looking more closely at real estate, we recognised a similar pattern.",
          "Before someone can make a confident decision about a property, there are questions that need answers.",
          "What is the history of the title? Does the survey plan align with the available maps? What restrictions or setbacks affect the property? What do existing records tell us about the location?",
          "The answers may exist, but finding them can mean navigating different sources, interpreting technical documents, and bringing separate pieces of information together.",
          "For someone trying to make a property decision, that creates uncertainty. For professionals trying to advise their clients, it creates more work.",
          "The industry was different. The underlying challenge felt familiar.",
          "Important decisions depended on information that was difficult to bring together and interpret in one place.",
        ],
      },
      {
        id: "same-shape",
        label: "The same shape",
        heading: "We had seen this shape of problem before",
        paragraphs: [
          "Surveying had taught us to look beyond the document itself.",
          "A survey plan carries technical information, but its value extends into the decisions people make with it. Its coordinates, boundaries, and relationship to other records can influence what happens next.",
          "Real estate follows a similar logic. A property report is useful because of what it helps someone understand and decide.",
          "In both cases, the work involves more than collecting information. It involves connecting the right information, putting it into context, and making it useful at the point where a decision needs to be made.",
          "Recognising that pattern changed how we approached the problem.",
          "We did not need to begin by asking what features a real-estate platform should have. We needed to understand what someone would need to know before making a decision about a particular property, and how difficult it was to find those answers today.",
          "That became the starting point for REVA.",
        ],
      },
      {
        id: "building-reva",
        label: "Building REVA",
        heading: "Building REVA",
        paragraphs: [
          "REVA, our Real Estate Virtual Assistant, brings together property intelligence that helps people investigate a location before making a decision.",
          "It combines information such as title history, survey records, basemap alignment, setbacks, and land-use considerations into location-based reports.",
          "The aim is to help people move from scattered information to a clearer understanding of a property, without having to navigate every source independently.",
          "It is a different product serving a different industry. The questions, users, and workflows are not identical to those in surveying.",
          "But the thinking behind it comes from the same place.",
          "Start with the decision someone needs to make. Understand the information that decision depends on. Find where the process breaks down. Then build around what is missing.",
        ],
      },
      {
        id: "how-we-build",
        label: "How we build",
        heading: "What this means for how we build",
        paragraphs: [
          "Working across industries has reinforced something important for us at TwoNode.",
          "Industries have their own language, regulations, workflows, and ways of working. Understanding those differences takes time, and we cannot assume that a solution that works in one industry will automatically work in another.",
          "But some of the underlying problems repeat themselves.",
          "Information becomes fragmented. People spend time joining the pieces together. Important decisions take longer because the context is difficult to establish.",
          "Recognising these patterns gives us a place to start. Understanding the industry tells us what to do with that insight.",
          "That distinction matters. We are not interested in taking the same product everywhere. We are interested in understanding each industry's problems deeply enough to build something that fits.",
          "Surfboard came from what we learned about survey plan records. REVA came from recognising a related challenge in property decisions.",
          "Different products. Different workflows. A shared commitment to understanding the work before building the solution.",
          "And that is one of the things we continue to learn as we build TwoNode: sometimes, the experience that helps you solve your next problem comes from an industry you have already spent years trying to understand.",
        ],
      },
    ],
  },
];

export function getInsight(slug: string): InsightPost | undefined {
  return insights.find((p) => p.slug === slug);
}
