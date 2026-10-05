# Surfboard Documentation

Survey plan lodging and the government (MDA) approval workflow.

- [`cod-user-flow-summary.md`](./cod-user-flow-summary.md) — the Certificate of Deposit (CoD) journey end-to-end, in plain terms: submission, Remita payment, the 4-way parallel MDA review, queries, final lodging with OSSG.
- [`cod-user-and-technical-flow.md`](./cod-user-and-technical-flow.md) — the same journey with the underlying service functions, file paths, and database fields alongside each step.
- [`qr-earnings-stakeholder-brief.md`](./qr-earnings-stakeholder-brief.md) — the QR Code Earnings feature (turning a plan's QR code into passive income for surveyors): value proposition, stakeholder workflows, and current shipped status.
- [`association-subscription.md`](./association-subscription.md) — evaluation of the proposed **association subscription** (an association pays for its member surveyors' access) against the code, with the defects it exposes in today's subscription flow and a recommended, reconciled design. Proposal only — nothing implemented.
- [`tools/verification-record-copy.html`](./tools/verification-record-copy.html) — a standalone survey-plan verification tool.
- [`history/`](./history/) — pre-rebuild (Dec 2025) planning documents for the above features, kept for context; see that folder's own README for why they're separate from the current docs above.

For registration/login (native auth vs. Kinde, roles, the MDA-only-by-invite model), see [`../auth/`](../auth/). For payment mechanics (Paystack subscriptions, Remita CoD payments), see [`../payment/`](../payment/) — its `subscription-payments-flow.md` §2.C lists the known gaps in the subscription flow. For the postcode-enrichment idea (tagging plans with a NIPOST digital postcode), see [`../integrations/nigeria-postcode-api.md`](../integrations/nigeria-postcode-api.md).
