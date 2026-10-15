# TwoNode Main Site — Pages

Not a product platform (GBC/REVA/Surfboard each have their own file in this
folder) — this is the shared TwoNode corporate/marketing site and the
standalone tools that don't belong to one specific product, under
`app/(main)/`, `app/(noPopUp)/`, and `app/(projects)/redirect`.

## Corporate site (`app/(site)`)

The primary TwoNode marketing and corporate web presence ("Understand the industry. Build what it needs."), promoted from `/v2` to root `/`. It has its own root layout (`app/(site)/layout.tsx` — own `<html>`/`<body>`, Bricolage Grotesque and Sora fonts, `v4.css`, `#000b3d` theme color, full production metadata, `robots: index, follow`). Section components live in `app/(site)/components/` (`SiteHeader`, `Footer`, `PageShell`, `MotionLayer`, `ArticleStepNav`); content is data-driven from `app/(site)/data/industries.ts`, `insights.ts`, and `proof.ts`.

| Route                | File                                | Description                                                        |
| :------------------- | :---------------------------------- | :----------------------------------------------------------------- |
| `/`                  | `(site)/page.tsx`                   | Main corporate landing page                                        |
| `/our-story`         | `(site)/our-story/page.tsx`         | Company narrative & background                                     |
| `/industries/[slug]` | `(site)/industries/[slug]/page.tsx` | One page per industry (e.g. `surveying-geospatial`, `real-estate`) |
| `/insights`          | `(site)/insights/page.tsx`          | Insights / thought-leadership index                                |
| `/insights/[slug]`   | `(site)/insights/[slug]/page.tsx`   | Insight article detail view                                        |
| `/contact`           | `(site)/contact/page.tsx`           | Contact page                                                       |

## Legacy site (`app/(legacy)`)

Preserved older pages and tools from the original site shell. The previous homepage code is preserved in `app/(legacy)/previous-landing-page/page.jsx` with an explicit `notFound()` call so it renders a 404 response.

| Route                            | File                                              | Description                                          |
| -------------------------------- | ------------------------------------------------- | ---------------------------------------------------- |
| `/previous-landing-page`         | `(legacy)/previous-landing-page/page.jsx`         | Original homepage (renders 404 via `notFound()`)     |
| `/previous-landing-page-contact` | `(legacy)/previous-landing-page-contact/page.tsx` | Original contact page (renders 404 via `notFound()`) |
| `/about-us`                      | `(legacy)/about-us/page.tsx`                      | Legacy About TwoNode page                            |
| `/events`                        | `(legacy)/events/page.tsx`                        | Legacy Events listing                                |
| `/featurednews`                  | `(legacy)/featurednews/page.tsx`                  | Legacy Featured news/press                           |
| `/gallery`                       | `(legacy)/gallery/page.tsx`                       | Legacy Photo gallery                                 |
| `/services`                      | `(legacy)/services/page.tsx`                      | Legacy Services overview                             |
| `/present`                       | `(legacy)/present/page.tsx`                       | Legacy Presentation/pitch-deck page                  |
| `/login`                         | `(legacy)/login/page.tsx`                         | TwoNode-level login                                  |
| `/signup`                        | `(legacy)/signup/page.tsx`                        | TwoNode-level signup                                 |
| `/gbc-frame`                     | `(legacy)/gbc-frame/page.tsx`                     | Iframe-embeddable GBC page                           |

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
