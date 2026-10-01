# REVA Documentation

Property due-diligence report requests, for both registered users and one-off guests.

- [`user-flow.md`](./user-flow.md) — the full journey: registration/login, submitting and paying for a request (signed-in and guest), admin review and report approval, notifications, account settings.
- [`user-stories.md`](./user-stories.md) — the same product broken into backlog-style stories by persona (Guest, Registered User, Admin, Super Admin), each marked shipped or flagged as a confirmed open gap.
- [`notification-system.md`](./notification-system.md) — the notification system's data model, triggers, and UI components.
- [`onetime-request-flow-review.md`](./onetime-request-flow-review.md) — a historical pre-rebuild review of the guest ("one-time request") flow's rough edges; most are now resolved, see the note at the top of that file.
- [`colors-readme.md`](./colors-readme.md) — the REVA color palette/design token reference.

For registration/login mechanics, see [`../auth/`](../auth/). For payment mechanics, see [`../payment/`](../payment/). For exactly what changed and when, see `docs/development-history/phases/phase-3-reva.md`.
