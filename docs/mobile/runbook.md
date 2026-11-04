# Running the mobile API: logs, alerts and emergency controls

For whoever is on call when the Surfboard app misbehaves (TASK-0015 1J). Everything here works without a deploy unless it says otherwise.

## 1. Reading the logs

The API writes one JSON line per event to the platform's log (Vercel's log search, or whatever the logs are drained to). A request from the app is recognised by the headers it always sends, `X-App-Version` and `X-App-Platform`, and **every failure of a mobile request carries them**, so a problem can be read per build instead of as one number.

| Field             | Meaning                                                                                                                                           |
| :---------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ |
| `appPlatform`     | `android`, `ios`, or `unknown` (the header was there but was not either). Absent on a website request.                                            |
| `appVersion`      | The version the app sent, for example `1.4.2` or `1.5.0-beta.2`. `invalid` when it was not something a version looks like. Absent on the website. |
| `route`, `method` | Where the request went.                                                                                                                           |
| `code`, `status`  | The failure, using the codes in [`api-contract.md`](./api-contract.md#failure-codes) (`UNAUTHENTICATED`, `FORBIDDEN`, `APP_UPDATE_REQUIRED`...).  |
| `userId`, `role`  | Who, when the request got as far as a session. An opaque id: never an email.                                                                      |

**Sign-in and refresh have their own lines** (`"message": "Mobile auth event"`), because a wrong password or a spent refresh token is not an error in the code:

| `event`          | `outcome`                                                 | Level | Extra fields           |
| :--------------- | :-------------------------------------------------------- | :---- | :--------------------- |
| `mobile.login`   | `ok`                                                      | info  | `userId`, `deviceHash` |
| `mobile.login`   | `invalid_credentials`, `rate_limited`                     | warn  | `deviceHash`           |
| `mobile.login`   | `inactive`, `account_type_not_supported`                  | warn  | `userId`, `deviceHash` |
| `mobile.refresh` | `invalid`, `inactive`, `conflict`, `role`, `rate_limited` | warn  | `code`                 |

A successful refresh writes no line (it happens every few minutes per phone, and the platform's own request log counts it). `deviceHash` is the first 12 characters of a SHA-256 of the device id: enough to follow one phone through the logs, and to find its lines from its id, without writing the id itself. **Never in any of these lines:** an email, a password, a token, a device id, a file link.

Searches that answer the usual questions (field names are exact):

- _Is one build failing?_ `appVersion = "1.4.2"` and `level = warn`, then group by `code`.
- _Are people being thrown out after a release?_ `code = UNAUTHENTICATED` or `event = mobile.refresh`, grouped by `appVersion`.
- _Is someone guessing passwords?_ `event = mobile.login` and `outcome = invalid_credentials` or `rate_limited`, grouped by `deviceHash` (one phone) or looked at over time (many).
- _Who got the update screen?_ `code = APP_UPDATE_REQUIRED`; the line before it, `Mobile client refused: an update is required`, names the store, the version and the minimum.
- _Is sign-in paused?_ `Mobile sign-in refused: the emergency switch is off`.

## 2. Alerts (1J.2): what to set, not yet set

No alert is configured: that needs the platform's alerting (Vercel's observability features, or a log drain to a service that can alert) and the maintainer's choice of where they go. These are the rules worth setting, from the fields above:

| Alert                                                                                                                                                                    | Why                                                              |
| :----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------- |
| `mobile.refresh` failures for one `appVersion` rise well above that version's normal (for example three times the same hour a week earlier) in the hours after a release | A release that cannot refresh signs everyone out an hour later.  |
| `code = UNAUTHENTICATED` or `FORBIDDEN` for one `appVersion` rises the same way                                                                                          | The app is being refused by something the release changed.       |
| `code = APP_UPDATE_REQUIRED` appears while **no minimum is set** (see section 4)                                                                                         | The gate refusing with nothing set means the settings are wrong. |
| `mobile.login` with `rate_limited` or `invalid_credentials` in bursts from many `deviceHash` values                                                                      | Credential guessing spread over phones.                          |
| Any 5xx (`level = error`) on a route under `/api/v1/auth/mobile` or `/api/v1/surfboard`                                                                                  | The server, not the app.                                         |

Thresholds need a few weeks of real traffic to set well; start with the release-day comparison against the same hour a week earlier.

## 3. End a person's app sign-ins (1J.3)

A person ends their own from the app (Profile, Signed-in devices). When they cannot (a lost or stolen phone), a Surfboard `ADMIN` or `SUPERADMIN` does it. There is no admin screen yet: sign in to the web admin, open any restricted page and run in the browser console (same origin, so the cookie and the cross-origin check are satisfied). An `ADMIN` cannot act on another `ADMIN` or a `SUPERADMIN`, as for deactivating an account.

```js
const id = "<the person's user id, from GET /api/v1/surfboard/admin/users>";

// What they are signed in on (no device ids; `id` is what you revoke by)
await (await fetch(`/api/v1/surfboard/admin/users/${id}/devices`)).json();

// End one
await fetch(`/api/v1/surfboard/admin/users/${id}/devices/<familyId>`, {
  method: "DELETE",
});

// End all of them (the lost phone)
await fetch(`/api/v1/surfboard/admin/users/${id}/devices`, {
  method: "DELETE",
});
```

What happens: the phone's refresh token stops working at once (its next refresh is `401 SESSION_INVALID`, so it is signed out within the access token's 15 minutes), and its push address is removed. Each action is written to the audit log as `REVOKE_DEVICE_SESSION` or `REVOKE_ALL_DEVICE_SESSIONS`, with the admin as the performer. If the account itself should stop, deactivate it as well (`PATCH /api/v1/surfboard/admin/users/{id}/status`): a deactivated account cannot refresh either.

## 4. Force an update, or pause sign-in

Built in 1B: a minimum version per store and an emergency switch for new sign-ins, changed with `PATCH /api/v1/surfboard/settings/mobile-app`, no deploy, effective within a minute. The steps and the console snippet are in [TASK-0015](../tasks/0015-mobile-app-and-api.md) under 1B ("Runbook"). **Do not set a minimum above the newest version in the store**, and not before a build with the update screen has been released.

## 5. After a release

1. Run `npm run contract:live` against the environment ([`api-contract.md`](./api-contract.md)): it checks every route the app calls against the published schemas.
2. Watch the searches in section 1 for the new `appVersion` for the first hours.
3. If the new build is bad: pause sign-in (section 4) to stop new people arriving; once a fixed build is in the store, set the minimum to that fixed version so the bad build is told to update; end signed-in devices only if their sessions are the problem (section 3).
