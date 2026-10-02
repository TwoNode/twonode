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
