# Association subscription and mobile app: research refresh (2026-10-18)

Status: **research only. Nothing is built.** This refreshes [`../surfboard/association-subscription.md`](../surfboard/association-subscription.md) (2026-10-04) and [`surfboard-mobile-app-evaluation.md`](./surfboard-mobile-app-evaluation.md) (2026-10-04) against the code on `dev` and current vendor facts as of 2026-10-18. Those two documents remain the detailed design; this one records what changed and what to decide.

## Decisions already made

- The mobile app lives in a **new project, `twonode-mobile`**, at `/home/rojitech/Desktop/CODEC/REACT-NATIVE/twonode-mobile` (with the maintainer's other React Native projects, not next to this repo). It does not exist yet. The backend work it needs stays in this repo.

## Association: what changed since 2026-10-04

1. **Phase 0 is done.** The three prerequisite PRs were merged into `dev` on 2026-10-04/05: #262 (one-time payment amount and reference binding), #261 (errored webhook events are reprocessed), #263 (additive periods and clamped month maths), plus #273 (underpayment rejected for REVA/CoD). `applyPaymentPeriod` in `surfboard/services/subscriptionService.ts` now takes advisory locks on the payment reference and on the user, checks a ledger keyed by reference, and refuses a reference already credited to another user. The association path should call it once per surveyor with a per-item key such as `assoc:<paymentReference>:<surveyorId>`.
2. **Still nothing association-specific exists.** No `Association*` models in `prisma/schema`, no `ASSOCIATION_ADMIN` role, no routes.
3. **Wiring points verified in code (2026-10-18):**
   - Webhook (`app/api/webhooks/paystack/route.ts`) routes by reference prefix and by `metadata.type` (for example `surfboard_onetime_subscription`). A `surfboard_association` branch fits the same pattern.
   - Role plumbing: `INVITABLE_ROLES`, `ACCEPT_PATH` and `loginPathFor` in `lib/auth/adminInvitations.ts`. `loginPathFor` sends every non-admin Surfboard role to `/surfboard-mda/login`, so an association admin needs its own branch. `proxy.ts` has one branch per path prefix; a new `/surfboard-association` prefix needs one.
   - The only cron is the daily expiry reminder (`vercel.json`). The reconciliation job in the design needs a new cron entry; how often Vercel runs it depends on the plan (not checked), so a daily sweep plus on-demand verify may be the realistic floor.
4. **Email verification interplay:** association admins are staff accounts created through the invitation flow; confirm accepting an invitation counts as verified (or the gate will block them if enforcement is turned on).

### Paystack

- No Paystack primitive lets one payer cover several users in one transaction. Split payments divide one customer's money between subaccounts and do not apply. The documented design stands: one server-initialised transaction with a locked total, our own `AssociationPayment` and item rows, fulfilment from the webhook and from a verify call through one idempotent function.
- Webhook signatures use HMAC-SHA512 (`x-paystack-signature`); the existing route already verifies them.

### Privacy

- The Nigeria Data Protection Act 2023 is now backed by the **GAID 2025** (effective 2025-09-19 per law-firm commentary, not read from the NDPC text). It sets duties for controllers "of major importance": registration, a data protection officer, annual compliance audit returns, breach reporting within 72 hours. Whether TwoNode counts as a major-importance controller is a legal question. The association member list (names, SURCON numbers, masked contact) is the sharpest new exposure. Counsel should confirm the lawful basis and whether surveyors need notice before this ships.

### Decisions needed (unchanged from the design, §7)

1. The eight open product questions in the design (§4.13): which surveyors count, activation date rule, association prices and discount, refunds, duplicate coverage, reminders to the association admin, receipt format for large batches, one or many admins per state.
2. Separate association-admin accounts (recommended) and disabling the surveyor's recurring Paystack plan when an association extends them.
3. Minimum member fields and the lawful basis (needs counsel).
4. A **read-only production count** of `USER` accounts by `residenceState` (including null and invalid values) before launch. This needs your go (production is read-only by default).

## Mobile: what changed since 2026-10-04

1. **Expo is now SDK 58** (`expo` 58.0.x on npm; SDK 57 shipped around 2026-06-30). The evaluation named SDK 56 as current. SDK 56 has a known Hermes V1 memory regression with `react-native-worklets`/`reanimated` that Expo says is fixed from SDK 57. **Start on SDK 58.** Supporting packages at the time of checking: `expo-notifications` 58.1.x, `expo-secure-store` 58.0.x, `@maplibre/maplibre-react-native` 11.5.0 (peers: Expo 54+, React Native 0.80+, New Architecture only; needs a development build, not Expo Go).
2. **Toolchain on this machine (checked):** Node 24.11.1, npm 11.6.2, `adb` present. `eas-cli` is not installed (25.2.0 available). This is Linux, so iOS builds can only run in EAS cloud; the Android emulator or a physical device is not confirmed.
3. **Auth is still the one hard blocker, and it is in this repo.** There is still no `Authorization: Bearer` path in `withAuth`/`getServerSession`, no mobile login/refresh routes, no OpenAPI spec, and no shared package. Everything in evaluation §3 still stands: bearer-aware CSRF, re-rotation inside the 30 second refresh window, non-IP rate-limit keys, a device label per session, `X-App-Version`, and the OTP verification screen.
4. **Apple:** the May 2025 US court order lets apps on the **US storefront** link out to web purchase. Third-party 2026 summaries say other storefronts, including Nigeria's, still do not allow it (read Apple's own guidelines to confirm). So the plan stands: show subscription status only, no purchase or "pay on web" call to action on iOS (guideline 3.1.3(f)), registration stays on the web.
5. **Google Play:** a personal account created after 2023-11-13 needs a 12-tester, 14-day closed test; an **organisation** account is exempt but needs business verification (a D-U-N-S number; secondary sources say 2 to 4 weeks). Google's separate **developer identity verification** began rolling out on 2026-09-30 in Brazil, Indonesia, Singapore and Thailand with a wider rollout through 2026 to 2027 (blog sources; read Google's own pages). Start store accounts early; they have the longest lead time.
6. **Maps and tiles** (OpenStreetMap public tiles, unofficial Google tiles) remain unresolved, and the web map is now Coming Soon, which removes today's licensing exposure but not the decision.

### Decisions needed

1. Order of work (see below).
2. Store accounts: is TwoNode registered as an organisation (D-U-N-S, Apple Developer Program)?
3. Basemap, satellite imagery and geocoder providers.
4. Whether physical-copy submission needs an active subscription on mobile, and the definition of "ready for physical submission".
5. Whether `twonode-mobile` should be added to `Twonode.code-workspace`. (It will be in a different folder from this repo.)

## Recommended order

1. **Association Phase 1 in this repo** (schema, service, webhook branch, reconciliation): backend only, additive, built on the merged Phase 0, and nothing is visible to users until an association exists.
2. **Mobile auth surface in this repo** (stage 0): additive and independent of association. It can run in parallel because it touches `lib/auth/*` and `withAuth`, not the subscription code.
3. **Scaffold `twonode-mobile`** (Expo SDK 58, TypeScript, Expo Router, EAS dev build with MapLibre) only once the mobile auth routes exist on `dev`, so the app has something real to sign in against.
4. Association admin and portal (phases 2 and 3), then surveyor "Subscribed by" (phase 4), which is also what the mobile Profile screen reads.

Sources: [Expo SDK 56 changelog](https://expo.dev/changelog/sdk-56.md) · [Expo SDK 56](https://expo.dev/sdk/56) · npm registry (`expo`, `expo-notifications`, `expo-secure-store`, `@maplibre/maplibre-react-native`, `eas-cli`, read 2026-10-18) · [MapLibre RN, Expo setup](https://maplibre.org/maplibre-react-native/docs/setup/expo) · [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) · [Paystack split payments](https://paystack.com/docs/payments/split-payments) · [Play Console: testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465) · [GAID 2025 commentary](https://www.mondaq.com/nigeria/privacy-protection/1620778/synoptic-analysis-of-the-nigeria-data-protection-act-general-application-and-implementation-directive-gaid-2025).
