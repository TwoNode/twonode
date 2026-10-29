# The mobile API contract

What the Surfboard mobile app is promised, written down once and checked from both sides. It exists so that a change to the website's API cannot break an installed app without a test failing first (TASK-0015 1C).

**The document:** [`openapi.json`](./openapi.json), OpenAPI 3.1, 23 operations, 33 named schemas. **Do not edit it by hand:** it is generated from the code in `lib/mobile/contract/` and a test fails if the file and the code disagree. The app keeps a copy (`src/lib/api/contract/openapi.json` in `TwoNode/twonode-mobile`) and tests itself against it.

## What is in it

| Piece            | Where                                   | What it does                                                                                                                                                                                                                              |
| :--------------- | :-------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Answer shapes    | `lib/mobile/contract/schemas.ts`        | One schema per answer (zod 4, from the `zod/v4` entry of the zod already installed). The single place the shapes are written.                                                                                                             |
| Operations       | `lib/mobile/contract/endpoints.ts`      | One entry per route the app calls: method, path, who may call it, whether the app version gate applies, query parameters, request body (with an example that must be accepted and bad ones that must be refused) and the failures it has. |
| Failure codes    | `lib/mobile/contract/errorCodes.ts`     | Every `code` the app reacts to, with its status, what it means and what the app does. Also the failures that carry no `code`.                                                                                                             |
| The document     | `lib/mobile/contract/openapi.ts`        | Builds `openapi.json` from the three above.                                                                                                                                                                                               |
| Recorded answers | `lib/mobile/contract/__fixtures__/`     | Answers the real server gave against a throwaway database (the app keeps the same files). Every one must parse with the schemas and come out unchanged.                                                                                   |
| Live check       | `scripts/mobile/contract-live-check.ts` | Signs in to a running server and checks every read route's answer against the schemas. `npm run contract:live`.                                                                                                                           |

The operations in the document are the ones the app calls today: sign-in and sessions, the account, plans, records, stats, the map, files, the wallet, the subscription and push. The website's own routes, the admin and MDA routes and the actions the app does not make yet (create, edit, share, pay) are not in it. Add an operation when the app starts to call it.

## What is checked, and by what

| A change like this...                                                                                                  | ...is caught by                                                                                                                                               |
| :--------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| a field added, removed, renamed or retyped in a service's return type (`PlanSummary`, `PlanStats`, `WalletSummary`...) | `tsc` (`npx tsc --noEmit`): the schema and the type must agree, so the contract has to be changed on purpose                                                  |
| a route answering something other than the schema says (a missing field, a leaked email or stored link)                | the recorded answers (a real answer must parse **without losing a key**: a field the schema does not name is lost) and the live check                         |
| a route's role, verification or version-gate rule changed                                                              | `lib/mobile/contract/__tests__/routes.test.ts`, which calls the real route handlers                                                                           |
| a query parameter dropped, renamed or no longer read; a request body rule changed                                      | the same test: each documented parameter must change what the route's own parser returns, and each body example must be accepted or refused by the real route |
| a failure code or its status changed, or a new one added in a mobile route                                             | the same test, against `errorCodes.ts` and the error classes in `lib/api/errors.ts`                                                                           |
| a new route under `app/api/v1/auth/mobile/`                                                                            | the same test: every method of every route there must be in the document                                                                                      |
| anything above changing the document                                                                                   | `lib/mobile/contract/__tests__/openapi.test.ts`, which compares the generated document with `docs/mobile/openapi.json`                                        |
| the app asking for something the document does not allow                                                               | the app's `src/lib/api/__tests__/contract.test.ts` (routes, query parameters, bodies) and its recorded answers                                                |
| a deployed server answering differently from the code                                                                  | `npm run contract:live` against that server                                                                                                                   |

## Changing the API: the steps

1. **Change the code** (service, route or parser) and the contract with it. `tsc` and the tests tell you what else has to move.
2. **Regenerate the document:** `npm run docs:openapi`, then read the diff of `docs/mobile/openapi.json`. That diff is what the app will see.
3. **Decide the version** in `lib/mobile/contract/openapi.ts` (`OPENAPI_VERSION`) and add a line to the history below.
   - **Major** (2.0.0): anything an installed app could break on, such as a field removed, renamed or retyped, a value removed from a list, a route moved, a code or status changed, a parameter made required. Do not ship it to an API the released apps use unless the version gate (`426`) is set so they update first.
   - **Minor** (1.1.0): anything an app can ignore, such as a new field, a new route, a new value in a list the app already treats as open (`displayStatus` codes are), a new optional parameter.
4. **Copy the file to the app** (`src/lib/api/contract/openapi.json`) and run the app's tests. A failure names the call or recording that would break.
5. After a deploy, run `npm run contract:live` against that environment.

An old app ignores a field it does not know. It does **not** survive a field it needs going missing or changing type, which is why removals and retypes are major changes.

## Failure codes

The list is in `errorCodes.ts` and, with each operation's own failures, in the document (`x-error-codes`, and a `code` list on every failure response). Summary: `VALIDATION_ERROR` 400, `UNAUTHENTICATED` 401, `SESSION_INVALID` 401, `FORBIDDEN` 403, `EMAIL_VERIFICATION_REQUIRED` 403, `SUBSCRIPTION_REQUIRED` 403, `ACCOUNT_TYPE_NOT_SUPPORTED` 403, `ACCOUNT_INACTIVE` 403, `NOT_FOUND` 404, `REFRESH_CONFLICT` 409, `FILE_NOT_VIEWABLE` 422, `RATE_LIMITED` 429, `APP_UPDATE_REQUIRED` 426, `MOBILE_SIGN_IN_DISABLED` 503 and the four `VERIFICATION_CODE_*` 400s. Some older failures have **no `code`** (a wrong password, a sign-in over the rate limit, a blocked cross-origin call, a bad `platform` on `/auth/me`); the app reads those by status. They are listed in the document (`x-uncoded-failures`) and recorded as issue I-050.

## History

| Version | Date       | Change                                                                                                                                                   |
| :------ | :--------- | :------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0.0   | 2026-10-28 | First publication: the 23 operations the app calls on the day the contract was written down, including `/auth/me` with `verificationCodeSentAt` (1A.14). |

## Not done

- **Serving the document at a URL** (1C.2). It is a file in the repository. Publishing it would show the list of mobile routes to anyone, so it waits for a decision. With it, the app's CI could fetch staging's document and compare it with its copy, which would remove the manual copy in step 4.
- **Running the tests on every pull request.** This repository has no workflow that runs `npm test`; the checks above run when someone runs the tests. The app repository does run its tests on every pull request.
- **A generated client for the app** (1C.3). The app's readers are written by hand on purpose: they drop a bad row, refuse a bad answer whole where a silent gap would mislead (the map's display correction) and ignore what they do not know. A generated client would not do that. The app instead checks its calls and recordings against the document.
- **Request validators shared with the routes.** The routes validate with zod 3 and keep their schemas local; the document's request schemas are written beside it and kept honest by the tests above. Moving the routes' schemas into shared modules would let one definition serve both.
