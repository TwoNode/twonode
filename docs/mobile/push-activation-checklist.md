# Push notifications: what is left to switch them on

- **Written:** 2026-11-16, for the maintainer (the Apple, Firebase and Expo steps are theirs: they need the maintainer's own accounts).
- **Short version:** the code is finished on both sides. What is missing is configuration that only the maintainer can supply: a Firebase file for Android, an Apple push key for iPhone, an optional Expo token, and a new build to test with.
- **Related:** the API's sender (`lib/push/sender.ts`, off unless `PUSH_ENABLED` is exactly `1`), the app repo's `docs/tasks/0011-plan-links-filters-files-and-push.md` (section 9 and part C), and [`runbook.md`](./runbook.md).

## 1. Where things stand (2026-11-16)

| Piece                                                                                                                    | State                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API: device tokens, receipts, preferences, quiet hours, pushes for queried, shared and created plans and payouts         | Built and merged to `dev`; on staging since the promotion PR #559 (2026-11-16)                                                                                               |
| App: asks permission, registers the phone's address, shows Profile > Push notifications, opens the right plan from a tap | Built and merged to the app's `main`                                                                                                                                         |
| `PUSH_ENABLED=1` on Vercel                                                                                               | **Set on Preview (staging) and Production on 2026-11-16.** Staging was rebuilt with it. **Production only reads it at its next deploy; production has not been redeployed.** |
| Android push credentials (Firebase)                                                                                      | **Missing.** The EAS project has no `GOOGLE_SERVICES_JSON` in Preview or Production                                                                                          |
| iPhone push credentials (Apple push key, APNs)                                                                           | **Unknown.** The iOS build is entitled for push; whether EAS holds a key can be seen only with `eas credentials -p ios` in a terminal signed in to Apple                     |
| `EXPO_ACCESS_TOKEN` on Vercel                                                                                            | Not set. Optional (the sender works without it); needed only if "Enhanced push security" is turned on at Expo                                                                |
| A build made after all of the above, and a real test                                                                     | Not done. The iOS build `a7c8138f` and the Android build `3264197b` were made before the staging rebuild                                                                     |

## 2. What the maintainer does, in order

**Do 2.1 first: it is enough to test on an iPhone, because Apple's push service does not need the Firebase file.**

### 2.1 iPhone: the Apple push key (APNs)

1. In your own terminal (Apple asks for the Apple ID and a code, so a script cannot do it): `npx eas-cli@latest credentials -p ios`.
2. Choose the `preview` profile, then the push notifications key. If EAS shows an APNs key, you are done; if not, let EAS create one (it signs in to your Apple Developer account and makes the key) or upload an existing `.p8` file.
3. Nothing else changes in the app: the bundle already carries the push entitlement.

### 2.2 Android: the Firebase file

1. Create a Firebase project (the console is at firebase.google.com) and add an Android app with the package name `com.twonode.surfboard`.
2. Download **`google-services.json`** for that app.
3. In the Firebase project settings, open Service accounts and generate a private key (this is the FCM v1 credential). Upload it to EAS: `npx eas-cli@latest credentials -p android`, then the Google service account key for push notifications (FCM V1).
4. Hand me `google-services.json` in a local file (not in chat). I add it as an EAS **file variable** named `GOOGLE_SERVICES_JSON` for the Preview and Production environments (`app.config.js` reads it and sets `android.googleServicesFile`; never commit the file), then rebuild Android.
5. Without this file an Android build has no push address at all (the earlier Android build has no `google_app_id`).

### 2.3 Server: the Expo access token (optional, recommended before launch)

The EAS command line cannot create a token; it is made on the website.

1. Sign in at expo.dev and switch to the `twonode-technologies` account.
2. Account settings, Access tokens, Create token, named for example `surfboard-api-push`. The token is shown once.
3. Save it in a local file (for example `out/expo-push-token.txt` in the API checkout, which git ignores). Do not paste it into chat.
4. Tell the assistant. It adds `EXPO_ACCESS_TOKEN` to Vercel Preview and Production as a sensitive variable (`vercel env add EXPO_ACCESS_TOKEN`, read from the file, never printed), then deletes the file.
5. **Only then** turn on "Enhanced push security" for the project in Expo's settings, after pushes work without it. With it on, Expo rejects any push that does not carry the token.

### 2.4 A new build and a real test

1. Build a new iOS preview build (and an Android one after 2.2) from the app's `main`; the recipe is in the assistant's notes and in the app repo's `docs/tasks/0007-phase-7-release.md` section 11. Every `eas build` needs the maintainer's own go.
2. Install the iOS build on the iPhone. Open Profile, then Push notifications, and turn it on. **"On" with no yellow note means the phone's address reached the server.** A yellow "could not finish turning this on" means the address step failed.
3. Make a push happen: have someone share a plan with you, or create a plan in the website, or query a plan from the MDA side. Quiet hours (if you set them) drop pushes instead of delaying them.
4. If nothing arrives, read the server side before guessing: `vercel logs` for the staging deployment, and the `PushReceiptTicket` table's receipts (the API checks Expo's receipts once a day).

## 3. Production is a separate step, and it has an order

**Status 2026-11-17: steps 1 and 2 are done.** PR #568 promoted `main` to `prod` (merged 15:41 UTC) and `migrate-production.yml` applied the device-token, push-receipt and push-preference tables (with the other pending migrations) at 15:43 UTC (run 44117370647). The production deploy of 15:45 UTC therefore runs the push code, and `PUSH_ENABLED` exists on Vercel's Production environment (created 2026-11-16; its value was not read, step 3 expects `1`), so push is switched on in production. No production app build exists yet to register a phone, so nothing is sent until step 4. What follows is the order as it was written, before the promotion.

Before 2026-11-17 production had neither the push work nor API PRs #550 to #553, and redeploying it would have run push code against tables that did not exist there. The order:

1. **Promote** the API from `main` to `prod` (a draft pull request the maintainer merges). Done 2026-11-17, PR #568.
2. **Run the migrations on the production database first**, then the code: `20261028100000_device_tokens`, `20261029100000_push_receipt_tickets` and `20261029110000_push_preferences` (all additive, so safe before the code). Done 2026-11-17, but after the merge rather than before it; see [`../DEPLOYMENT.md`](../DEPLOYMENT.md).
3. Then the production deploy picks up `PUSH_ENABLED=1`, which is already set. Done by the 2026-11-17 deploy.
4. Build the store apps from the `production` profile with the credentials from 2.1 and 2.2.

## 4. If a push must be stopped

- **Stop all pushes at once:** remove or change `PUSH_ENABLED` in Vercel and redeploy; the sender becomes a no-op (`NullPushSender`). Sign-in and every other feature are unaffected.
- **Stop one person's:** they turn it off in Profile > Push notifications, or the phone's own notification settings.
