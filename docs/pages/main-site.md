# TwoNode Main Site — Pages

Not a product platform (GBC/REVA/Surfboard each have their own file in this
folder) — this is the shared TwoNode corporate/marketing site and the
standalone tools that don't belong to one specific product, under
`app/(main)/`, `app/(noPopUp)/`, and `app/(projects)/redirect`.

## Corporate site (`app/(main)`)

| Route           | File                           | Description                                                                             |
| --------------- | ------------------------------ | --------------------------------------------------------------------------------------- |
| `/`             | `(main)/page.jsx`              | TwoNode homepage                                                                        |
| `/about-us`     | `(main)/about-us/page.tsx`     | About TwoNode                                                                           |
| `/contact`      | `(main)/contact/page.tsx`      | Contact form                                                                            |
| `/events`       | `(main)/events/page.tsx`       | Events listing                                                                          |
| `/featurednews` | `(main)/featurednews/page.tsx` | Featured news/press                                                                     |
| `/gallery`      | `(main)/gallery/page.tsx`      | Photo gallery                                                                           |
| `/services`     | `(main)/services/page.tsx`     | Services overview                                                                       |
| `/present`      | `(main)/present/page.tsx`      | Presentation/pitch-deck page                                                            |
| `/login`        | `(main)/login/page.tsx`        | TwoNode-level login                                                                     |
| `/signup`       | `(main)/signup/page.tsx`       | TwoNode-level signup                                                                    |
| `/gbc-frame`    | `(main)/gbc-frame/page.tsx`    | Iframe-embeddable GBC page (GBC-specific, kept here since it shares the `(main)` shell) |

## New corporate site (`app/v2`, scaffolded 2026-09-28)

A redesigned TwoNode marketing site ("We build for industries") that lives **alongside** the existing `(main)` site rather than replacing it. It is its own top-level route group with its own root layout (`app/v2/layout.tsx` — own `<html>`/`<body>`, Fraunces display serif + the app-wide Bricolage Grotesque for body, `--v2-*` colour tokens from `globals.css`, Google Analytics via `NEXT_PUBLIC_GOOGLE_ANALYTICS`, `robots: index, follow`). `proxy.ts` has no `/v2` rules, so every page is public. Section components live in `app/v2/components/` (`NavV2`, `FooterV2`, `Opening`, `Industries`, `WhatWeBelieve`, `HowWeBuild`, `Proof`, `BiggerIdea`, `InsideTwoNode`, `OurStory`, `WhatsNext`); content is data-driven from `app/v2/data/industries.ts` and `app/v2/data/insights.ts`.

| Route                   | File                            | Description                                                                                                                                                       |
| :---------------------- | :------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/v2`                   | `v2/page.tsx`                   | Landing page composed from the section components above                                                                                                           |
| `/v2/our-story`         | `v2/our-story/page.tsx`         | Company story                                                                                                                                                     |
| `/v2/industries/[slug]` | `v2/industries/[slug]/page.tsx` | One page per industry (`generateStaticParams` from `industries.ts`; currently `surveying-geospatial`, `real-estate`)                                              |
| `/v2/insights`          | `v2/insights/page.tsx`          | Insights/articles index                                                                                                                                           |
| `/v2/insights/[slug]`   | `v2/insights/[slug]/page.tsx`   | Single insight article (from `insights.ts`)                                                                                                                       |
| `/v2/contact`           | `v2/contact/page.tsx`           | Contact — a `mailto:info@twonodetechnologies.com` link only; **no form is wired up yet** (the existing `ReachOutToUs` form isn't a drop-in fit for the v2 design) |

Error handling: `app/v2/error.tsx`. The v2 designs prototyped in `out/TwoNode_V2_Design_Canvas.html` are a local, git-ignored design canvas, not part of the shipped site.

## Standalone tools (`app/(noPopUp)`)

Rendered without the main site's popup/chrome layout.

| Route             | File                                | Description                                 |
| ----------------- | ----------------------------------- | ------------------------------------------- |
| `/gbccertificate` | `(noPopUp)/gbccertificate/page.tsx` | Standalone GBC certificate print/frame view |
| `/grid/calculate` | `(noPopUp)/grid/calculate/page.tsx` | Grid reference calculator                   |
| `/grid/generate`  | `(noPopUp)/grid/generate/page.tsx`  | Grid reference generator                    |
| `/grid/route`     | `(noPopUp)/grid/route/page.tsx`     | Grid routing tool                           |
| `/grid/search`    | `(noPopUp)/grid/search/page.tsx`    | Grid reference search                       |
| `/grid/verify`    | `(noPopUp)/grid/verify/page.tsx`    | Grid reference verification                 |

## Other

| Route       | File                           | Description                                                |
| ----------- | ------------------------------ | ---------------------------------------------------------- |
| `/redirect` | `(projects)/redirect/page.tsx` | Generic auth/OAuth redirect handler shared across products |
