# Integrations

Research and design notes for third-party systems Twonodes uses or is considering. Each document says at the top whether it describes something **shipped** or only **researched**.

- [`nigeria-postcode-api.md`](./nigeria-postcode-api.md) — the NIPOST **National Digital Postcode** API (`docs.postcode.gov.ng`): what it offers, which products it fits (REVA best, Surfboard optional, GBC none), an assessment of tagging survey plans with their centroid's postcode, ranked follow-on ideas, a server-side/fail-open design, and the questions to put to NIPOST. _Status: research — nothing implemented._

Integrations that are already live are documented with the feature that uses them: Paystack and Remita under [`../payment/`](../payment/), Kinde under [`../auth/`](../auth/), WhatsApp providers in [`../functions/shared.md`](../functions/shared.md) (`lib/whatsapp/`).
